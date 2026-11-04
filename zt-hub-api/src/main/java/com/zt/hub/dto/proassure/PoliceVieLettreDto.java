package com.zt.hub.dto.proassure;

import java.math.BigDecimal;

public interface PoliceVieLettreDto {
    String  getDateEncaissement();
    BigDecimal getContributionEncaisse();
    BigDecimal getContributionPrevoyance();
    BigDecimal getContributionEpargne();
    BigDecimal getTauxPb();
    BigDecimal getEcAvecPb();

}
