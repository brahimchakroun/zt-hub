package com.zt.hub.service.proassure;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.zt.hub.dto.proassure.EpargneCalculDto;
import com.zt.hub.dto.proassure.PoliceInfoDto;
import com.zt.hub.dto.proassure.PoliceVieLettreDto;
import com.zt.hub.dto.proassure.PoliceVieLettreEntetePdf;
import com.zt.hub.dto.proassure.QuittanceReglementDto;
import com.zt.hub.projection.QuittanceReglementProjection;
import com.zt.hub.service.HtmlPdfService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class QuittanceReglementService {

    private final com.zt.hub.repository.proassure.QuittancierRepository quittancierRepository;
    private final HtmlPdfService htmlPdfService;

    public List<QuittanceReglementDto> findQuittanceReglementProjection(String numeroPolice) {

        List<QuittanceReglementProjection> projections = quittancierRepository
                .findQuittanceReglementProjection(numeroPolice);
        return projections.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    public List<EpargneCalculDto> findEpargneCalcul(String numeroPolice) {
        return quittancierRepository.findEpargneCalcul(numeroPolice);
    }

    public PoliceInfoDto findPoliceEpargneInfo(String numeroPolice) {
        return quittancierRepository.findPoliceEpargneInfo(numeroPolice);
    }

    private QuittanceReglementDto convertToDto(QuittanceReglementProjection projection) {
        return new QuittanceReglementDto(
                projection.getDateCalcul(),
                projection.getCodeAgence(),
                projection.getNumeroPolice(),
                projection.getTermeComptant(),
                projection.getDateEffet(),
                projection.getEtatMvt(),
                projection.getNumeroQuittance(),
                projection.getMontant());
    }

    public byte[] generatePdfLettreVie(String numeroPolice) throws Exception {

    long globalStart = System.currentTimeMillis();

    System.out.println("=== Début generatePdfLettreVie ===");

    long start = System.currentTimeMillis();

    List<PoliceVieLettreDto> rawData =
            quittancierRepository.findLettreEpargneInfo(numeroPolice);

    System.out.println("findLettreEpargneInfo = "
            + (System.currentTimeMillis() - start)
            + " ms");

    start = System.currentTimeMillis();

    List<Map<String, Object>> processedRows = new ArrayList<>();

    int size = rawData.size();
    for (int i = 0; i < size; i++) {

        PoliceVieLettreDto current = rawData.get(i);

        Map<String, Object> rowMap = new HashMap<>();

        rowMap.put("date_encaissement", current.getDateEncaissement());
        rowMap.put("contribution_encaisse",
                formatAmount(current.getContributionEncaisse()));
        rowMap.put("contribution_prevoyance",
                formatAmount(current.getContributionPrevoyance()));
        rowMap.put("contribution_epargne",
                formatAmount(current.getContributionEpargne()));
        rowMap.put("taux_pb",
                formatRate(current.getTauxPb()));
        rowMap.put("ec_avec_pb",
                formatAmount(current.getEcAvecPb()));

        boolean showTaux = false;
        int rowspan = 1;

        if (i == 0 || !equalsWithNullCheck(
                current.getTauxPb(),
                rawData.get(i - 1).getTauxPb())) {

            showTaux = true;

            for (int j = i + 1; j < size; j++) {
                if (equalsWithNullCheck(
                        current.getTauxPb(),
                        rawData.get(j).getTauxPb())) {
                    rowspan++;
                } else {
                    break;
                }
            }
        }

        rowMap.put("showTaux", showTaux);
        rowMap.put("rowspan", rowspan);

        processedRows.add(rowMap);
    }

    System.out.println("Préparation données = "
            + (System.currentTimeMillis() - start)
            + " ms");

    start = System.currentTimeMillis();

    PoliceVieLettreEntetePdf policeVieLettreEntetePdf =
            quittancierRepository.findPoliceVieLettreEntetePdf(numeroPolice);

    System.out.println("findPoliceVieLettreEntetePdf = "
            + (System.currentTimeMillis() - start)
            + " ms");

    if (policeVieLettreEntetePdf == null) {
        return null;
    }

    start = System.currentTimeMillis();

    byte[] pdf = htmlPdfService.generatePdfLettreVieFromHtml(
            numeroPolice,
            policeVieLettreEntetePdf.getTitre(),
            policeVieLettreEntetePdf.getEntete(),
            processedRows);

    System.out.println("generatePdfLettreVieFromHtml = "
            + (System.currentTimeMillis() - start)
            + " ms");

    System.out.println("Temps global = "
            + (System.currentTimeMillis() - globalStart)
            + " ms");

    return pdf;
}

    public byte[] generatePdfLettreVie_(String numeroPolice) throws Exception {
        long globalStart = System.currentTimeMillis();
        numeroPolice = "'" + numeroPolice.trim() + "'";
        List<PoliceVieLettreDto> rawData = quittancierRepository.findLettreEpargneInfo(numeroPolice);
        List<Map<String, Object>> processedRows = new ArrayList<>();

        int size = rawData.size();
        for (int i = 0; i < size; i++) {
            PoliceVieLettreDto current = rawData.get(i);
            Map<String, Object> rowMap = new HashMap<>();

            rowMap.put("date_encaissement", current.getDateEncaissement());

            // Formatage des montants à 3 décimales et gestion du "0.0" -> "-"
            rowMap.put("contribution_encaisse", formatAmount(current.getContributionEncaisse()));
            rowMap.put("contribution_prevoyance", formatAmount(current.getContributionPrevoyance()));
            rowMap.put("contribution_epargne", formatAmount(current.getContributionEpargne()));

            // Formatage du taux avec le signe % (ex: 5.08%)
            rowMap.put("taux_pb", formatRate(current.getTauxPb()));

            rowMap.put("ec_avec_pb", formatAmount(current.getEcAvecPb()));

            // Logique de fusion (rowspan) basée sur la valeur brute (avant formatage)
            boolean showTaux = false;
            int rowspan = 1;

            if (i == 0 || !equalsWithNullCheck(current.getTauxPb(), rawData.get(i - 1).getTauxPb())) {
                showTaux = true;
                for (int j = i + 1; j < size; j++) {
                    if (equalsWithNullCheck(current.getTauxPb(), rawData.get(j).getTauxPb())) {
                        rowspan++;
                    } else {
                        break;
                    }
                }
            }

            rowMap.put("showTaux", showTaux);
            rowMap.put("rowspan", rowspan);

            processedRows.add(rowMap);
        }
        long start = System.currentTimeMillis();
        PoliceVieLettreEntetePdf policeVieLettreEntetePdf = quittancierRepository
                .findPoliceVieLettreEntetePdf(numeroPolice);
       
        System.out.println(
            "Temps total = "
            + (System.currentTimeMillis() - start)
            + " ms"
        );
        if (policeVieLettreEntetePdf == null) {
            System.out.println();
            return null;
        }
       start = System.currentTimeMillis();

    byte[] pdf = htmlPdfService.generatePdfLettreVieFromHtml(
            numeroPolice,
            policeVieLettreEntetePdf.getTitre(),
            policeVieLettreEntetePdf.getEntete(),
            processedRows);

    System.out.println("generatePdfLettreVieFromHtml = "
            + (System.currentTimeMillis() - start)
            + " ms");

    System.out.println("Temps global = "
            + (System.currentTimeMillis() - globalStart)
            + " ms");

    return pdf;
    }

    // Méthode pour formater les montants (3 décimales, et "-" si 0 ou null)
    private String formatAmount(BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) == 0) {
            return "-";
        }
        // Arrondi à 3 chiffres après la virgule avec le mode standard d'arrondi
        // mi-partie
        return String.format(Locale.US, "%.3f", value.setScale(3, RoundingMode.HALF_UP));
    }

    // Méthode pour formater le taux (ex: 5.08%)
    private String formatRate(Object value) {
        if (value == null) {
            return "-";
        }
        BigDecimal bd;
        if (value instanceof BigDecimal) {
            bd = (BigDecimal) value;
        } else if (value instanceof Number) {
            bd = BigDecimal.valueOf(((Number) value).doubleValue());
        } else {
            return value.toString();
        }

        if (bd.compareTo(BigDecimal.ZERO) == 0) {
            return "-";
        }

        // Arrondi à 2 décimales pour le taux et ajout du signe %
        return String.format(Locale.US, "%.2f%%", bd.setScale(2, RoundingMode.HALF_UP));
    }

    private boolean equalsWithNullCheck(Object obj1, Object obj2) {
        if (obj1 == null && obj2 == null)
            return true;
        if (obj1 == null || obj2 == null)
            return false;
        return obj1.equals(obj2);
    }
}
