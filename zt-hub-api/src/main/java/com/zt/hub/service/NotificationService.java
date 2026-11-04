package com.zt.hub.service;


import com.zt.hub.dto.SendCredentialsRequest;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.from-name:Zitouna Takaful}")
    private String fromName;

    @Async
    public void sendCredentials(SendCredentialsRequest request) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(request.getEmail());
            helper.setSubject(request.getSubject());

            String htmlContent = buildCredentialsEmail(
                    request.getUsername(),
                    request.getPassword()
            );

            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Email d'identifiants envoyé à {}", request.getEmail());

        } catch (MessagingException e) {
            log.error("Erreur lors de l'envoi de l'email à {}", request.getEmail(), e);
            throw new RuntimeException("Impossible d'envoyer l'email", e);
        } catch (Exception e) {
            log.error("Erreur inattendue lors de l'envoi de l'email", e);
            throw new RuntimeException("Erreur d'envoi d'email", e);
        }
    }

    private String buildCredentialsEmail(String username, String password) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 20px; }
                    .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                    .header { background: #0f766e; color: white; padding: 28px 32px; text-align: center; }
                    .header h1 { margin: 0; font-size: 22px; }
                    .content { padding: 32px; color: #334155; line-height: 1.6; }
                    .credentials { background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; }
                    .credentials p { margin: 8px 0; }
                    .label { font-weight: 600; color: #64748b; font-size: 13px; }
                    .value { font-size: 16px; color: #0f172a; font-family: monospace; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; }
                    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-top: 24px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Zitouna Takaful</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour,</p>
                        <p>Votre compte a été créé sur la plateforme <strong>Zt-hub</strong>.</p>
                        <p>Voici vos identifiants de connexion :</p>

                        <div class="credentials">
                            <p>
                                <span class="label">Identifiant / Email</span><br>
                                <span class="value">%s</span>
                            </p>
                            <p>
                                <span class="label">Mot de passe temporaire</span><br>
                                <span class="value">%s</span>
                            </p>
                        </div>

                        <div class="warning">
                            ⚠️ Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.
                        </div>

                        <p style="margin-top: 28px;">Cordialement,<br>L'équipe Zitouna Takaful</p>
                    </div>
                    <div class="footer">
                        Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                    </div>
                </div>
            </body>
            </html>
            """.formatted(username, password);
    }
}