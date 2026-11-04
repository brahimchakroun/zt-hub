package com.zt.hub.entity.proassure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "QUITTANCIER")
public class Quittancier {

    @Id
    @Column(name = "NUMERO_POLICE")
    private String numeroPolice;
}