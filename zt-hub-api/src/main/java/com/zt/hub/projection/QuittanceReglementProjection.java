package com.zt.hub.projection;


import java.math.BigDecimal;

public interface QuittanceReglementProjection {

    String getDateCalcul();

    String getCodeAgence();

    String getNumeroPolice();

    String getNumeroQuittance();

    String getTermeComptant();

    String getDateEffet();

    String getEtatMvt();

    BigDecimal getMontant();
}