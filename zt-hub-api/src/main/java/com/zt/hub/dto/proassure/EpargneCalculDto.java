package com.zt.hub.dto.proassure;

import java.math.BigDecimal;

public interface EpargneCalculDto {

    String getNumeroQuittance();
    String getDateCalcul();
    BigDecimal getContributionEpargne();
    BigDecimal getPeriodeCourue();          // ou Integer si tu préfères
    BigDecimal getChargementAcquisition();
    BigDecimal getContributionNette();
    BigDecimal getEcAvecPb();
    BigDecimal getEcSansPb();
}