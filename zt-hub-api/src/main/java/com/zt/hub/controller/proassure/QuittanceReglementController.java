package com.zt.hub.controller.proassure;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zt.hub.dto.ApiResponse;
import com.zt.hub.dto.proassure.EpargneCalculDto;
import com.zt.hub.dto.proassure.PoliceInfoDto;
import com.zt.hub.dto.proassure.PoliceVieLettreDto;
import com.zt.hub.dto.proassure.QuittanceReglementDto;
import com.zt.hub.service.proassure.QuittanceReglementService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/apiproassure")
@RequiredArgsConstructor 
public class QuittanceReglementController {

    private final QuittanceReglementService quittanceReglementService;

    @GetMapping("/quittanceReglement")
    public ApiResponse<List<QuittanceReglementDto>> getNouvellesPolicesGroupes(
            @RequestParam
            String numeroPolice) {

        return ApiResponse.of(quittanceReglementService.findQuittanceReglementProjection(numeroPolice));  
    }

    @GetMapping("/epargneCalcul")
    public ApiResponse<List<EpargneCalculDto>> findEpargneCalcul(@RequestParam String numeroPolice) {
        return ApiResponse.of(quittanceReglementService.findEpargneCalcul(numeroPolice));
    }


    @GetMapping("/policeEpargneInfo")
    public ApiResponse<PoliceInfoDto> findPoliceEpargneInfo(@RequestParam String numeroPolice) {
        return ApiResponse.of(quittanceReglementService.findPoliceEpargneInfo(numeroPolice));
    }

   @GetMapping("/policeEpargneLettre")
    public ResponseEntity<byte[]> policeEpargneLettre(@RequestParam String numeroPolice) throws Exception {
        
        // 1. Génération du PDF en octets (byte[])
        byte[] pdfBytes = quittanceReglementService.generatePdfLettreVie(numeroPolice);

        // 2. Configuration des en-têtes HTTP pour indiquer qu'il s'agit d'un PDF
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        
        // "inline" pour l'afficher directement dans le navigateur, ou "attachment" pour forcer le téléchargement
        headers.setContentDispositionFormData("inline", "police_epargne.pdf");
        
        // Optionnel : empêcher la mise en cache
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        // 3. Retourner la réponse HTTP avec les octets et le statut 200 OK
        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
