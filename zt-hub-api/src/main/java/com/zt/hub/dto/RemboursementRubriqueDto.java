package com.zt.hub.dto;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Builder 
@Data 
public class RemboursementRubriqueDto {

    private Integer codeRubrique;
    private String libelleRubrique;
    private BigDecimal montantRembourse;
}