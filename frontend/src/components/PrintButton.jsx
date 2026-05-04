const PrintButton = ({ bookings, title = 'All Bookings' }) => {
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
  const isPujaPersons = title === 'Puja Persons';

  const handlePrint = () => {
    const rows = bookings.map((b, i) => {
      const baseRow = `
        <td>${b.serialNo}</td>
        <td>${fmt(b.bookingDate)}</td>
        <td>${fmt(b.visitDate)}</td>
        <td>${b.phone}</td>
        <td>${b.gothram || '—'}</td>
        <td>${b.member1}</td>
        <td>${b.member2 || '—'}</td>
        <td style="text-align:center">${b.paid ? '✅' : '❌'}</td>
        <td style="text-align:center">${b.paymentMethod === 'phonepe' ? '📱 PhonePe' : b.paymentMethod === 'cash' ? '💵 Cash' : '—'}</td>
        <td style="text-align:center">${b.completed ? '✅' : '❌'}</td>
        <td style="text-align:center">${b.pdfSent ? '✅' : '❌'}</td>
      `;
      
      const pujaColumns = isPujaPersons ? `
        <td style="text-align:center">${b.pujaGrocery ? '✅' : '❌'}</td>
        <td style="text-align:center">${b.pujaGroceryPaymentMethod === 'phonepe' ? '📱 PhonePe' : b.pujaGroceryPaymentMethod === 'cash' ? '💵 Cash' : '—'}</td>
        <td style="text-align:center">${b.pujaGroceryDone ? '✅' : '❌'}</td>
      ` : '';
      
      return `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#fdf6f0'}">
          ${baseRow}${pujaColumns}
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #2c1810; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #b5451b; padding-bottom: 12px; }
          .header h1 { font-size: 20px; color: #b5451b; }
          .header p { font-size: 13px; color: #7a6055; margin-top: 4px; }
          .meta { display: flex; justify-content: space-between; font-size: 12px; color: #7a6055; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          thead { background: #b5451b; color: #fff; }
          th { padding: 8px 6px; text-align: left; font-weight: 600; white-space: nowrap; }
          td { padding: 7px 6px; border-bottom: 1px solid #e0d5cc; }
          .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #7a6055; border-top: 1px solid #e0d5cc; padding-top: 10px; }
          @media print {
            body { padding: 10px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🕌 Sri Venkateswara Swami Temple, Vadapalli</h1>
          <p>Temple Ticket Manager — ${title}</p>
        </div>
        <div class="meta">
          <span>Total Records: <strong>${bookings.length}</strong></span>
          <span>Generated: ${new Date().toLocaleString('en-IN')}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Bookers Date</th>
              <th>Booked Date</th>
              <th>Phone</th>
              <th>Gothram</th>
              <th>Member 1</th>
              <th>Member 2</th>
              <th>Paid</th>
              <th>Payment</th>
              <th>Done</th>
              <th>Sent</th>
              ${isPujaPersons ? '<th>Puja Grocery</th><th>Puja Payment</th><th>Puja Done</th>' : ''}
            </tr>
          </thead>
              ${isPujaPersons ? '<th>Puja Grocery</th><th>Puja Payment</th><th>Puja Done</th>' : ''}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          Sri Venkateswara Swami Temple, Vadapalli &nbsp;|&nbsp; Printed on ${new Date().toLocaleDateString('en-IN')}
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <button className="btn btn-outline btn-sm" onClick={handlePrint} title="Print / Download PDF">
      🖨️ Print PDF
    </button>
  );
};

export default PrintButton;
