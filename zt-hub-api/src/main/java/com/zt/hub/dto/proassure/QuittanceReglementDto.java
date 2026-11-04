package com.zt.hub.dto.proassure;

import java.math.BigDecimal;

public record QuittanceReglementDto(
        String dateCalcul,
        String codeAgence,
        String numeroPolice,
        String termeComptant,
        String dateEffet,
        String etatMvt,
        String numeroQuittance,
        BigDecimal montant
) {
}