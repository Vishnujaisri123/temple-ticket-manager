import { updateBooking } from '../services/api';

const SendButton = ({ booking, isReminder = false, onSent, onRemoveFromDashboard }) => {
  const disabled = !booking.pdfUrl;

  const getPhone = () => {
    let phone = booking.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.slice(1);
    if (!phone.startsWith('91')) phone = '91' + phone;
    return phone;
  };

  const buildMessage = () => {
    const visitDate = new Date(booking.visitDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const pdfLink = booking.pdfUrl;
    const members = booking.member2
      ? `${booking.member1} & ${booking.member2}`
      : booking.member1;
    const gothram = booking.gothram ? `\n🏛️ Gothram: ${booking.gothram}` : '';

    return isReminder
      ? `🔔 *Reminder — Temple Visit*

🙏 Namaskaram ${booking.member1}!

This is a reminder that your darshan at *Sri Venkateswara Swami Temple, Vadapalli* is scheduled for:

📅 Visit Date: *${visitDate}*
👥 Members: ${members}${gothram}

Please carry your ticket 👇
📄 ${pdfLink}

Kindly be present on time. Have a blessed darshan! 🕌🙏`
      : `🙏 Namaskaram ${booking.member1}!

Your temple ticket is ready.

📅 Visit Date: *${visitDate}*
👥 Members: ${members}${gothram}

📄 Download your ticket here 👇
${pdfLink}

Jai Govinda! 🙏`;
  };

  const handleSend = async () => {
    const phone = getPhone();
    const message = buildMessage();

    // Try Web Share API first (mobile)
    if (navigator.share && booking.localPdfUrl) {
      try {
        const response = await fetch(booking.localPdfUrl);
        const blob = await response.blob();
        const file = new File([blob], `ticket_${booking.member1}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: `Temple Ticket — ${booking.member1}`, text: message, files: [file] });
          await markSent();
          return;
        }
      } catch { /* fall through */ }
    }

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Mark as sent after opening WhatsApp
    await markSent();
  };

  const markSent = async () => {
    try {
      const { data } = await updateBooking(booking._id, {
        pdfSent: true,
        sentAt: new Date().toISOString(),
      });
      onSent && onSent(data);
      onRemoveFromDashboard && onRemoveFromDashboard(data._id);
    } catch { /* silent */ }
  };

  return (
    <button
      className={`send-btn ${isReminder ? 'reminder' : ''}`}
      onClick={handleSend}
      disabled={disabled}
      title={disabled ? 'Upload PDF first' : `Send to ${booking.phone} via WhatsApp`}
    >
      <span>📱</span>
      {isReminder ? 'Remind' : 'Send'}
    </button>
  );
};

export default SendButton;
