import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Generate a high-resolution QR code data URL (Base64)
 */
export async function generateQRCodeDataUrl(data) {
  try {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

/**
 * Generate a PDF Ticket and pipe to an Express response stream
 */
export async function streamTicketPDF(event, registration, res) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [600, 360], // Landscape boarding pass style
        margins: { top: 20, bottom: 20, left: 24, right: 24 }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Ticket-${registration.ticketCode || 'Pass'}.pdf"`
      );

      doc.pipe(res);

      // Background Card
      doc.rect(10, 10, 580, 340).fillAndStroke('#0b0f19', '#3b82f6');

      // Top Header Banner
      doc.rect(10, 10, 580, 52).fill('#1e1b4b');
      doc.fillColor('#60a5fa').fontSize(16).font('Helvetica-Bold')
         .text('CITY PULSE', 26, 26, { continued: true });
      doc.fillColor('#94a3b8').fontSize(12).font('Helvetica')
         .text('  |  OFFICIAL ADMISSION TICKET');

      // VIP Status Pill
      doc.roundedRect(480, 22, 90, 24, 12).fill('#2563eb');
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
         .text('CONFIRMED', 495, 29);

      // Left Column: Event & Attendee Info
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
         .text(event.title || 'City Pulse Event', 26, 78, { width: 360 });

      doc.fillColor('#38bdf8').fontSize(11).font('Helvetica')
         .text(`Category: ${event.category || 'General'}  •  City: ${event.city || 'Global'}`, 26, 120);

      // Grid Info
      const startY = 145;
      
      // Date & Time
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('DATE & TIME', 26, startY);
      doc.fillColor('#f8fafc').fontSize(11).font('Helvetica-Bold')
         .text(`${event.date || 'TBD'} | ${event.time || '10:00 AM'}`, 26, startY + 14);

      // Venue
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('VENUE', 26, startY + 40);
      doc.fillColor('#f8fafc').fontSize(11).font('Helvetica-Bold')
         .text(event.venue || 'Main Auditorium', 26, startY + 54, { width: 340 });

      // Attendee Name & Email
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('ATTENDEE', 26, startY + 84);
      doc.fillColor('#a78bfa').fontSize(11).font('Helvetica-Bold')
         .text(`${registration.userName || 'Guest'} (${registration.userEmail || 'N/A'})`, 26, startY + 98);

      // Ticket ID Code
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('TICKET CODE', 26, startY + 128);
      doc.fillColor('#34d399').fontSize(13).font('Courier-Bold')
         .text(registration.ticketCode || 'TKT-00000', 26, startY + 142);

      // Perforated Vertical Divider Line
      doc.save();
      doc.lineWidth(1).strokeColor('#334155').dash(4, { space: 4 });
      doc.moveTo(395, 20).lineTo(395, 330).stroke();
      doc.restore();

      // Right Column: QR Code Box
      const qrPayload = JSON.stringify({
        ticketCode: registration.ticketCode,
        eventId: event.id || event._id,
        userEmail: registration.userEmail,
        status: registration.status || 'Confirmed'
      });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 140
      });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      doc.image(qrBuffer, 420, 85, { width: 140, height: 140 });

      doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica-Bold')
         .text('SCAN AT ENTRY', 420, 235, { align: 'center', width: 140 });

      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
         .text('Present this QR code to the event host upon arrival for instant check-in.', 410, 255, {
           align: 'center',
           width: 160
         });

      doc.end();
      doc.on('finish', resolve);
      doc.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}
