package com.zt.hub.service;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

@Service 
public class HtmlPdfService {

    @Autowired 
    private TemplateEngine templateEngine;

    public byte[] generatePdfLettreVieFromHtml(String numeroPolice, String title, String entete,List<Map<String, Object>> data) throws Exception {
        // Préparation du contexte Thymeleaf
        Context context = new Context();
        context.setVariable("numeroPolice", numeroPolice); 
        context.setVariable("title", title); 
        context.setVariable("entete", entete); 
        context.setVariable("rows", data); 

        // Génération du HTML compilé
        String htmlContent = templateEngine.process("pdf-lettre-vie-template", context);

        // Conversion en PDF avec OpenHTMLToPDF (basé sur PDFBox, écosystème robuste)
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        PdfRendererBuilder builder = new PdfRendererBuilder();
        builder.withHtmlContent(htmlContent, "");
        builder.toStream(os);
        builder.run();

        return os.toByteArray();
    }
}