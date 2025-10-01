const express = require('express');
const router = express.Router();
const Pedido = require('../models/pedido');
const { generarTicketPDF } = require('../utils/ticketPDF');

router.get('/:pedidoId/ticket', async (req, res) => {
  try {
    const { pedidoId } = req.params;

    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      return res.status(404).send('Pedido no encontrado');
    }
console.log(pedido)
    // generar PDF
    const pdfBuffer = await generarTicketPDF(pedido);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=ticket-${pedido._id}.pdf`
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

module.exports = router;