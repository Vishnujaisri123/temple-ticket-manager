const { PDFParse } = require('pdf-parse');
const Tesseract = require('tesseract.js');
const Booking = require('../models/Booking');

/**
 * Normalizes text to handle spelling and formatting differences
 * Converts to lowercase, removes non-alphabetic characters, and applies common Telugu-English phonetic mappings
 */
const normalizeText = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Extracts raw JPEG buffers from a PDF binary stream (for OCR scanning)
 */
const extractJpegsFromPdf = (pdfBuffer) => {
  const jpegs = [];
  let pos = 0;
  while (true) {
    const start = pdfBuffer.indexOf(Buffer.from([0xff, 0xd8]), pos);
    if (start === -1) break;
    const end = pdfBuffer.indexOf(Buffer.from([0xff, 0xd9]), start);
    if (end === -1) break;
    
    const jpegBuffer = pdfBuffer.subarray(start, end + 2);
    jpegs.push(jpegBuffer);
    pos = end + 2;
    // Cap at 3 images to avoid memory bloating
    if (jpegs.length >= 3) break;
  }
  return jpegs;
};

/**
 * Extracts text from PDF using pdf-parse, with Tesseract.js OCR fallback
 */
const extractPdfText = async (pdfBuffer) => {
  try {
    // 1. Try standard text parsing
    const parser = new PDFParse({ data: pdfBuffer });
    const parsed = await parser.getText();
    await parser.destroy();
    let text = parsed.text || '';
    
    // 2. If text is empty or too short, it's likely a scanned image PDF. Run OCR.
    if (text.trim().length < 15) {
      console.log('[Extraction] Text content minimal. Attempting OCR fallback...');
      const jpegs = extractJpegsFromPdf(pdfBuffer);
      if (jpegs.length > 0) {
        console.log(`[Extraction] Extracted ${jpegs.length} image(s) from PDF for OCR`);
        let ocrText = '';
        for (let i = 0; i < jpegs.length; i++) {
          const result = await Tesseract.recognize(jpegs[i], 'eng');
          ocrText += '\n' + (result.data?.text || '');
        }
        if (ocrText.trim().length > 0) {
          text = ocrText;
        }
      } else {
        console.log('[Extraction] No JPEG streams found in PDF for OCR.');
      }
    }
    
    return text;
  } catch (err) {
    console.error('[Extraction] Error extracting text from PDF:', err.message);
    throw err;
  }
};

/**
 * Standardizes date string to YYYY-MM-DD
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Clean date string
  const cleanStr = dateStr.trim();
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmYRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
  const dmYMatch = cleanStr.match(dmYRegex);
  if (dmYMatch) {
    const day = String(dmYMatch[1]).padStart(2, '0');
    const month = String(dmYMatch[2]).padStart(2, '0');
    const year = dmYMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // YYYY/MM/DD or YYYY-MM-DD
  const yMdRegex = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/;
  const yMdMatch = cleanStr.match(yMdRegex);
  if (yMdMatch) {
    const year = yMdMatch[1];
    const month = String(yMdMatch[2]).padStart(2, '0');
    const day = String(yMdMatch[3]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // DD Month YYYY (e.g. 23 July 2026)
  const verboseRegex = /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i;
  const verboseMatch = cleanStr.match(verboseRegex);
  if (verboseMatch) {
    const day = String(verboseMatch[1]).padStart(2, '0');
    const months = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[verboseMatch[2].toLowerCase()];
    const year = verboseMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

/**
 * Extracts specific fields from raw text
 */
const parseFields = (text) => {
  const fields = {
    ticketId: '',
    member1: '',
    member2: '',
    gothram: '',
    visitDate: '',
    slotTime: '',
    sevaName: '',
    amount: ''
  };

  // 1. Ticket ID
  const ticketMatch = text.match(/Ticket\s*ID\s*[:|-]?\s*\n?([A-Za-z0-9]+)/i);
  if (ticketMatch) fields.ticketId = ticketMatch[1].trim();

  // 2. Booker Names
  const bookerMatch = text.match(/Booker\s*Names\s*[:|-]?\s*\n?([^\n]+)(?:\n([^\n]+))?/i);
  if (bookerMatch) {
    fields.member1 = bookerMatch[1] ? bookerMatch[1].trim() : '';
    if (bookerMatch[2] && !/Gothram|Date|Slot|Ticket|Seva|Amount/i.test(bookerMatch[2])) {
      fields.member2 = bookerMatch[2].trim();
    }
  } else {
    // Fallback old format
    const nameMatches = [...text.matchAll(/(?:devotee|pilgrim|member)?\s*name\s*[:|-]\s*([a-zA-Z\s]+)/gi)];
    if (nameMatches.length > 0) {
      fields.member1 = nameMatches[0][1].trim().split(/\n|\r/)[0].trim();
      if (nameMatches.length > 1) {
        fields.member2 = nameMatches[1][1].trim().split(/\n|\r/)[0].trim();
      }
    }
  }

  // 3. Gothram
  const gothramMatch = text.match(/(?:Gothram|Gothra)\s*[:|-]?\s*\n?([a-zA-Z\s]+)/i);
  if (gothramMatch) fields.gothram = gothramMatch[1].trim().split(/\n|\r/)[0].trim();

  // 4. Visit Date
  const dateMatch = text.match(/(?:Performance\s*Date|Date|Visit Date|Date of Visit)\s*[:|-]?\s*\n?([a-zA-Z0-9\s\/\-]+)/i);
  if (dateMatch) fields.visitDate = parseDate(dateMatch[1].trim().split(/\n|\r/)[0].trim()) || '';

  // 5. Timeslot
  const slotMatch = text.match(/(?:Time\s*Slot|Slot|Time|Slot Time|Samayam)\s*[:|-]?\s*\n?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (slotMatch) fields.slotTime = slotMatch[1].trim().toLowerCase().replace(/\s+/g, '');

  // 6. Seva Name
  const sevaMatch = text.match(/Seva\s*Name\s*[:|-]?\s*\n?([a-zA-Z\s]+)/i);
  if (sevaMatch) fields.sevaName = sevaMatch[1].trim().split(/\n|\r/)[0].trim();

  // 7. Amount
  const amountMatch = text.match(/Amount\s*[:|-]?\s*\n?(?:Rs\.?|₹|INR)?\s*([0-9,\.]+)/i);
  if (amountMatch) fields.amount = amountMatch[1].trim().split(/\n|\r/)[0].trim();

  return fields;
};

/**
 * Formats a Date object to YYYY-MM-DD in Asia/Kolkata (IST) timezone
 */
const getISTDateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Searches active/pending bookings and scores them to find matches
 */
const findMatches = async (extractedData, adminId) => {
  const bookings = await Booking.find({ createdBy: adminId }).lean();
  
  const extMember1 = normalizeText(extractedData.member1);
  const extMember2 = normalizeText(extractedData.member2);
  const extGothram = normalizeText(extractedData.gothram);
  const extDate = extractedData.visitDate; // YYYY-MM-DD format
  const extSlot = extractedData.slotTime ? extractedData.slotTime.replace(/\s+/g, '') : '';
  
  const results = [];
  
  for (const b of bookings) {
    const bMember1 = normalizeText(b.member1);
    const bMember2 = normalizeText(b.member2);
    const bGothram = normalizeText(b.gothram);
    const bDate = getISTDateString(b.visitDate);
    const bSlot = b.slotTime ? b.slotTime.toLowerCase().replace(/\s+/g, '') : '';
    
    let confidence = 0;
    let matchPriority = 0;
    
    const matchedM1 = (bMember1 && extMember1 && bMember1 === extMember1);
    const matchedM2 = (bMember2 && extMember2 && bMember2 === extMember2);
    const matchedG = (bGothram && extGothram && bGothram === extGothram);
    const matchedD = (bDate && extDate && bDate === extDate);
    const matchedS = (bSlot && extSlot && bSlot === extSlot);
    
    // Priority 1: Member1 + Member2 + Gothram + Booked Date
    if (matchedM1 && matchedM2 && matchedG && matchedD) {
      confidence = 100;
      matchPriority = 1;
    }
    // Priority 2: Member1 + Gothram + Booked Date
    else if (matchedM1 && matchedG && matchedD) {
      confidence = 95;
      matchPriority = 2;
    }
    // Priority 3: Member1 + Member2
    else if (matchedM1 && matchedM2) {
      confidence = 85;
      matchPriority = 3;
    }
    // Priority 4: Gothram + Booked Date
    else if (matchedG && matchedD) {
      confidence = 75;
      matchPriority = 4;
    }
    // Priority 5: Booked Date + Timeslot
    else if (matchedD && matchedS) {
      confidence = 70;
      matchPriority = 5;
    }
    
    if (confidence === 0) {
      if (matchedM1) confidence += 40;
      if (matchedG) confidence += 30;
      if (matchedD) confidence += 20;
    }

    const matchReport = {
      member1: {
        extracted: extractedData.member1 || 'N/A',
        dbValue: b.member1 || 'N/A',
        matched: matchedM1
      },
      member2: {
        extracted: extractedData.member2 || 'N/A',
        dbValue: b.member2 || 'N/A',
        matched: matchedM2
      },
      gothram: {
        extracted: extractedData.gothram || 'N/A',
        dbValue: b.gothram || 'N/A',
        matched: matchedG
      },
      visitDate: {
        extracted: extractedData.visitDate || 'N/A',
        dbValue: bDate || 'N/A',
        matched: matchedD
      },
      timeslot: {
        extracted: extractedData.slotTime || 'N/A',
        dbValue: b.slotTime || 'N/A',
        matched: matchedS
      }
    };
    
    results.push({
      booking: b,
      confidence,
      priority: matchPriority || 99,
      matchReport
    });
  }
  
  // Sort by confidence DESC
  return results.sort((a, b) => b.confidence - a.confidence);
};

module.exports = {
  extractPdfText,
  parseFields,
  findMatches,
  normalizeText
};
