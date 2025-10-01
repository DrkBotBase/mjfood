const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function generarTicketPDF(pedido) {
  return new Promise(async (resolve, reject) => {
    try {
      const qrData = `https://mjfood.top/domi/${pedido._id}`;
      const qrImage = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });

      const doc = new PDFDocument({
        size: [164, 600], // 58mm = 164px
        margin: 5
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Logo o nombre
      doc.fontSize(12).text(pedido.extension.toUpperCase(), { align: 'center' });
      doc.moveDown(0.5);

      // Datos cliente
      doc.fontSize(8)
        .text(`Cliente: ${pedido.nombreCliente}`)
        .text(`Tel: ${pedido.phone}`)
        .text(`Dir: ${pedido.direccion}`)
        .text(`Pago: ${pedido.metodoPago}`)
        .text(`Fecha: ${new Date(pedido.fechaPedido).toLocaleString('es-CO')}`);
      doc.moveDown(0.5);

      // Línea
      doc.moveTo(0, doc.y).lineTo(164, doc.y).stroke();
      doc.moveDown(0.3);

      // Items
      pedido.items.forEach(item => {
        doc.fontSize(6)
          .text(`${item.cantidad}x ${item.categoria} ${item.nombre} ${item.variante || ''}`, { width: 120, continued: true })
          .text(`$${item.subtotal}`, { align: 'right' });
      });

      doc.moveDown(0.3);
      doc.moveTo(0, doc.y).lineTo(164, doc.y).stroke();
      doc.moveDown(0.3);

      // Totales
      doc.fontSize(9)
        .text(`Subtotal: $${pedido.valorPedido}`)
        .text(`Domicilio: $${pedido.valorDomicilio}`)
        .text(`Total: $${pedido.valorPedido + pedido.valorDomicilio || 0}`);//, { align: 'right' });

      doc.moveDown(0.5);
      // Insertar QR al lado derecho
      const qrSize = 80;
      doc.image(qrImage, (164 - qrSize) / 2, doc.y, { width: qrSize });
      doc.moveDown(1.5);

      //doc.fontSize(6).text(`Pedido ID: ${pedido._id}`, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generarTicketPDF };