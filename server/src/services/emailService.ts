export async function sendEmail(to: string, subject: string, text: string) {
  // TODO: Integrar Resend o Nodemailer en Fase 2 o cuando haya credenciales
  console.log('====================================');
  console.log(`📧 SIMULANDO ENVÍO DE EMAIL a: ${to}`);
  console.log(`Asunto: ${subject}`);
  console.log(`Mensaje: ${text}`);
  console.log('====================================');
  return true;
}
