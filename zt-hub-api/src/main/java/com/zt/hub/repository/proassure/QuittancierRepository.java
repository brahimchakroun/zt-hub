package com.zt.hub.repository.proassure;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.zt.hub.dto.proassure.EpargneCalculDto;
import com.zt.hub.dto.proassure.PoliceInfoDto;
import com.zt.hub.dto.proassure.PoliceVieLettreDto;
import com.zt.hub.dto.proassure.PoliceVieLettreEntetePdf;
import com.zt.hub.entity.proassure.Quittancier;
import com.zt.hub.projection.QuittanceReglementProjection;

@Repository
public  interface QuittancierRepository extends JpaRepository<Quittancier, String> {


	@Query(value = """
       select  Case WHEN a.Sexe = 'Femme' Then 'Madame' else 'Monsieur' end titre,CONCAT(
        contrat.ASSURE, 
        CHAR(13) + CHAR(10), 
        a.Adresse, 
        CHAR(13) + CHAR(10), 
        a.ville, 
        ' ', 
        a.CP_VILLE
    ) AS entete
			from CONTRAT
			inner join NOTE_COUVERTURE_VIE nc on nc.NUMERO_POLICE = contrat.NUMERO_POLICE
			inner join PERSONNE p on p.id = contrat.code_client
			inner join ASSURE a on a.ID = contrat.CODE_ASSURE and a.CODE_AGENCE =contrat.CODE_AGENCE
			where CONTRAT.NUMERO_POLICE = :numeroPolice
    """,
    nativeQuery = true) PoliceVieLettreEntetePdf findPoliceVieLettreEntetePdf(
        @Param("numeroPolice") String numeroPolice);


    @Query(value = """
       select CONVERT(VARCHAR(10), r.DATE_MVT, 103) date_calcul  , q.CODE_AGENCE ,q.numero_police,q.NUMERO_QUITTANCE as numeroQuittance ,q.TERME_COMPTANT , CONVERT(VARCHAR(10), q.DATE_EFFET, 103), q.ETAT_MVT, r.MONTANT    from Vue_QUITTANCIER_NEW_3 q INNER JOIN VIE_OPERATIONS_REGLEMENTS r ON q.NUMERO_QUITTANCE = r.NUMERO_QUITTANCE AND q.numero_police =r.NUMERO_POLICE 
where q.numero_police  = :numeroPolice
    """,
    nativeQuery = true) 
List<QuittanceReglementProjection> findQuittanceReglementProjection(
        @Param("numeroPolice") String numeroPolice);

@Query(value = """
	DECLARE @p_police VARCHAR(50) = :numeroPolice;
			WITH police_i AS (
			SELECT
				c.NUMERO_POLICE,
				c.DATE_EFFET_POLICE,
				c.DATE_ECHEANCE_PRINCIPALE,
				c.DATE_EXPIRATION,
				mc.CARACTERISTIQUE_INT AS duree_contrat,
				CASE WHEN d.CODE_FRACTIONNEMENT =1 THEN 1 
					WHEN d.CODE_FRACTIONNEMENT =2 THEN 2
					WHEN d.CODE_FRACTIONNEMENT =3 THEN 4 
					WHEN d.CODE_FRACTIONNEMENT =4 THEN 12 END  NBR_QUITTANCE_FRAIS 
			FROM
				CONTRAT c
			INNER JOIN Vue_MVT_CARACTERISTIQUE mc
					ON
				mc.NUMERO_POLICE = c.NUMERO_POLICE
			INNER JOIN DUREE d on d.CODE_DUREE = c.TERME
			WHERE
				mc.CODE_CARACTERISTIQUE = 3
				AND c.NUMERO_POLICE = @p_police
			),
			contribution_prevoyance_base as (
			select sum(CARACTERISTIQUE_DBL )  prime_deces from Vue_MVT_CARACTERISTIQUE 
			where NUMERO_POLICE = @p_police
			and CODE_CARACTERISTIQUE  in (52,55,139,105,108)
			),
			etape_2_sans_prevoyance AS (
			SELECT
				q.NUMERO_QUITTANCE,
				q.DATE_EFFET,
				r.DATE_MVT AS date_calcul,
				r.PRIME_EPARGNIE AS contribution_epargne,
				q.CODE_AGENCE,
				q.NUMERO_POLICE,
				q.TERME_COMPTANT,
				q.ETAT_MVT,
				p.NBR_QUITTANCE_FRAIS,
				ROW_NUMBER() OVER (
					PARTITION BY q.NUMERO_QUITTANCE
					ORDER BY r.DATE_MVT
				) AS rang_ligne_quittance
			FROM Vue_QUITTANCIER_NEW_3 q
			INNER JOIN VIE_OPERATIONS_REGLEMENTS r
				ON q.NUMERO_QUITTANCE = r.NUMERO_QUITTANCE
			AND q.NUMERO_POLICE = r.NUMERO_POLICE
			INNER JOIN police_i p ON p.NUMERO_POLICE= q.NUMERO_POLICE
			WHERE q.ETAT_MVT = 1
			),
			etape_2 as (select e2.*,case when e2.rang_ligne_quittance = 1 AND cb.prime_deces is not null THEN cb.prime_deces / NBR_QUITTANCE_FRAIS ELSE 0 end as contribution_prevoyance from etape_2_sans_prevoyance e2, contribution_prevoyance_base cb),
			etape_2_avec_duree_plafonnee AS (
			SELECT
				e2.*,
				p.DATE_EFFET_POLICE ,
				p.duree_contrat,
				CASE
					WHEN p.duree_contrat > 20 THEN 20
					WHEN date_calcul >= '2020-06-30' THEN p.duree_contrat ELSE p.duree_contrat  +1
				END AS duree_plafonnee,
			DATEDIFF(MONTH, DATE_EFFET, DATE_CALCUL) / 12 + 1  AS annee_contrat
			FROM
				etape_2 e2
			INNER JOIN police_i p
					ON
				p.NUMERO_POLICE = e2.NUMERO_POLICE
			)  ,
			etape_3 AS (
			SELECT
				e3.*,
				CASE
					/* Avant 30/06/2020 */
					WHEN e3.date_calcul < '2020-06-30'
						AND e3.annee_contrat = 1
						THEN e3.contribution_epargne
							* 0.02
							* e3.duree_plafonnee
						WHEN e3.date_calcul < '2020-06-30'
						THEN e3.contribution_epargne * 0.02
					/* A partir du 30/06/2020 - agences exonérées */
						WHEN e3.date_calcul >= '2020-06-30'
						AND e3.CODE_AGENCE IN (2, 6, 9, 20)
						THEN 0
					/* A partir du 30/06/2020 - autres agences */
						WHEN e3.date_calcul >= '2020-06-30'
							AND date_effet < '2019-02-01'
							AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
						THEN e3.contribution_epargne
							* 0.0175
							WHEN e3.date_calcul >= '2020-06-30'
								AND date_effet >= '2019-02-01'
								AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
									AND e3.annee_contrat = 1
						THEN e3.contribution_epargne
							* 0.01
							* e3.duree_plafonnee
									WHEN e3.date_calcul >= '2020-06-30'
									AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
										AND e3.annee_contrat = 2
						THEN e3.contribution_epargne
							* 0.005
							* e3.duree_plafonnee
										WHEN e3.date_calcul >= '2020-06-30'
										AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
											AND e3.annee_contrat = 3
						THEN e3.contribution_epargne * 0.05
											WHEN e3.date_calcul >= '2020-06-30'
											AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
												AND e3.annee_contrat >= 4
						THEN e3.contribution_epargne * 0.0175
												ELSE 0
											END AS chargement_acquisition
										FROM
											etape_2_avec_duree_plafonnee e3
			), 
			etape_4 as (
			SELECT
				NUMERO_QUITTANCE,
				DATE_EFFET,
				date_calcul,
				CODE_AGENCE,
				NUMERO_POLICE,
				annee_contrat,
				duree_contrat,
				duree_plafonnee,
				contribution_epargne,
				chargement_acquisition,
				contribution_epargne - chargement_acquisition as contribution_nette,
				contribution_prevoyance,
				rang_ligne_quittance
			FROM
				etape_3) ,
			/*Ajout des ligne séparatrice debut chaque année + ligne 30/06/2020*/
			etape_5 as (
			select
				*
			from
				etape_4
			UNION
			SELECT 
				'' as NUMERO_QUITTANCE,
				null as DATE_EFFET,
				DATEFROMPARTS(YEAR(date_calcul)+1, 1,1) as date_calcul,
				'' as CODE_AGENCE,
				'' as NUMERO_POLICE,
				'' as annee_contrat,
				'' as duree_contrat,
				'' as duree_plafonnee,
				null as contribution_epargne,
				null as chargement_acquisition,
				null as contribution_nette,
				null as contribution_prevoyance,
				1 AS rang_ligne_quittance
			FROM
				etape_4 d
			WHERE
				NOT EXISTS (
				SELECT
					1
				FROM
					etape_4 x
				WHERE
					x.date_calcul = DATEFROMPARTS(YEAR(d.date_calcul)+ 1, 1, 1)
			)
			UNION
			SELECT 
				'' as NUMERO_QUITTANCE,
				null as DATE_EFFET,
				DATEFROMPARTS(2020, 6, 30) as date_calcul,
				'' as CODE_AGENCE,
				'' as NUMERO_POLICE,
				'' as annee_contrat,
				'' as duree_contrat,
				'' as duree_plafonnee,
				null as contribution_epargne,
				null as chargement_acquisition,
				null as contribution_nette,
				null as contribution_prevoyance,
				1 as rang_ligne_quittance 
			FROM
				etape_4 d
			WHERE
				DATEFROMPARTS(2020, 6, 30)> d.DATE_EFFET
					AND NOT EXISTS (
					SELECT
						1
					FROM
						etape_4 x
					WHERE
						x.date_calcul = DATEFROMPARTS(2020, 6, 30)
			) ) , 
			etape_6 as (
			select
				e.*,
				LAG(date_calcul) OVER (
			ORDER BY
				date_calcul) AS date_precedente,
				ISNULL( DATEDIFF(
					DAY,
					LAG(date_calcul) OVER (ORDER BY date_calcul),
					date_calcul
				) , 0) AS periode_courue
			from
				etape_5 e), 
			etape_7_base as (
			select
				e.*,
				CASE
					WHEN date_calcul < '2020-06-30' THEN 0.006
					else 0
				end as taux2,
				CASE YEAR(DATEADD(DAY, -1, date_calcul))
					WHEN  2013 THEN 0.051
					WHEN  2014 THEN 0.0505
					WHEN  2015 THEN 0.0504
					WHEN  2016 THEN 0.0466
					WHEN  2017 THEN 0.0508
					WHEN  2018 THEN 0.0627
					WHEN  2019 THEN 0.058
					WHEN  2020 THEN 0.05
					WHEN  2021 THEN 0.0513
					WHEN  2022 THEN 0.062
					WHEN  2023 THEN 0.062
					WHEN  2024 THEN 0.0646
					WHEN  2025 THEN 0.0622
					WHEN  2025 THEN 0.05
				end as taux1,
				ROW_NUMBER() OVER (
				ORDER BY date_calcul,rang_ligne_quittance) AS rn ,
				contribution_nette as ec_avec_pb, contribution_nette as ec_sans_pb
			from
				etape_6 e) , 
			etape_7 AS (
				SELECT
					duree_plafonnee,rn,rang_ligne_quittance,annee_contrat,
					taux1,
					taux2,
					NUMERO_QUITTANCE,
					DATE_EFFET,
					date_calcul,
					periode_courue,
					ISNULL(contribution_epargne,0) contribution_epargne,
					ISNULL(chargement_acquisition,0) chargement_acquisition,
					ISNULL(contribution_nette,0) contribution_nette, 
					ISNULL(contribution_prevoyance,0) contribution_prevoyance,  
				CAST ( ec_avec_pb AS DECIMAL(38,10)) ec_avec_pb,  CAST ( ec_sans_pb AS DECIMAL(38,10))   ec_sans_pb
				FROM etape_7_base
				WHERE rn = 1
				UNION ALL
				SELECT
					eb.duree_plafonnee,eb.rn,eb.rang_ligne_quittance,eb.annee_contrat,
					eb.taux1,
					eb.taux2,
					eb.NUMERO_QUITTANCE,
					eb.DATE_EFFET,
					eb.date_calcul,
					eb.periode_courue,
					ISNULL(eb.contribution_epargne,0) contribution_epargne,
					ISNULL(eb.chargement_acquisition,0) chargement_acquisition,
					ISNULL(eb.contribution_nette,0) contribution_nette,
					ISNULL(eb.contribution_prevoyance,0) contribution_prevoyance,  
				-- Garder un maximum de décimales
			CAST(
				CAST(e.ec_avec_pb AS DECIMAL(38,20)) *
				POWER(
					CAST((1.0 + eb.taux1) * (1.0 - eb.taux2) AS FLOAT),
					CAST(eb.periode_courue AS FLOAT) / 365.0
				)
				+ ISNULL(eb.contribution_nette, 0)
			AS DECIMAL(38,10)
			) AS ec_avec_pb  ,
					CAST(
				CAST(e.ec_sans_pb AS DECIMAL(38,20)) *
				POWER(
					CAST((1.0 - eb.taux2) AS FLOAT),
					CAST(eb.periode_courue AS FLOAT) / 365.0
				)
				+ ISNULL(eb.contribution_nette, 0)
			AS DECIMAL(38,10)
			) AS ec_sans_pb
				FROM etape_7 e
				INNER JOIN etape_7_base eb
					ON eb.rn = e.rn + 1
			)
			SELECT NUMERO_QUITTANCE AS numeroQuittance,CONVERT(VARCHAR(10), date_calcul, 103)  AS dateCalcul,
			contribution_epargne AS contributionEpargne,	
			periode_courue AS periodeCourue	,	
			chargement_acquisition AS chargementAcquisition,	
			contribution_nette AS contributionNette,	
			ec_avec_pb AS ecAvecPb,	
			ec_sans_pb AS ecSansPb
			FROM etape_7
			ORDER BY rn
			OPTION (MAXRECURSION 0)
    """, nativeQuery = true)
List<EpargneCalculDto> findEpargneCalcul(@Param("numeroPolice") String numeroPolice);

@Query(value = """
	SELECT
	c.NUMERO_POLICE,
	c.CODE_AGENCE ,
	CONVERT(VARCHAR(10), c.DATE_EFFET_POLICE, 103) DATE_EFFET_POLICE,
	CONVERT(VARCHAR(10), c.DATE_ECHEANCE_PRINCIPALE, 103) DATE_ECHEANCE_PRINCIPALE ,
	CONVERT(VARCHAR(10), c.DATE_EXPIRATION, 103) DATE_EXPIRATION,
	mc.CARACTERISTIQUE_INT AS duree_contrat
FROM
	CONTRAT c
INNER JOIN Vue_MVT_CARACTERISTIQUE mc
        ON
	mc.NUMERO_POLICE = c.NUMERO_POLICE
WHERE
	mc.CODE_CARACTERISTIQUE = 3
	AND c.NUMERO_POLICE = :numeroPolice
	 """
, nativeQuery = true)
PoliceInfoDto findPoliceEpargneInfo(@Param("numeroPolice") String numeroPolice);

@Query(value = """
	DECLARE @p_police VARCHAR(50) = :numeroPolice;
			WITH police_i AS (
			SELECT
				c.NUMERO_POLICE,
				c.DATE_EFFET_POLICE,
				c.DATE_ECHEANCE_PRINCIPALE,
				c.DATE_EXPIRATION,
				mc.CARACTERISTIQUE_INT AS duree_contrat,
				CASE WHEN d.CODE_FRACTIONNEMENT =1 THEN 1 
					WHEN d.CODE_FRACTIONNEMENT =2 THEN 2
					WHEN d.CODE_FRACTIONNEMENT =3 THEN 4 
					WHEN d.CODE_FRACTIONNEMENT =4 THEN 12 END  NBR_QUITTANCE_FRAIS 
			FROM
				CONTRAT c
			INNER JOIN Vue_MVT_CARACTERISTIQUE mc
					ON
				mc.NUMERO_POLICE = c.NUMERO_POLICE
			INNER JOIN DUREE d on d.CODE_DUREE = c.TERME
			WHERE
				mc.CODE_CARACTERISTIQUE = 3
				AND c.NUMERO_POLICE =  @p_police
			),
			contribution_prevoyance_base as (
			select sum(CARACTERISTIQUE_DBL )  prime_deces from Vue_MVT_CARACTERISTIQUE
			 where NUMERO_POLICE =  @p_police
			and CODE_CARACTERISTIQUE  in (52,55,139,105,108) ),
			etape_2_sans_prevoyance AS (
			SELECT
				q.NUMERO_QUITTANCE,
				q.DATE_EFFET,
				r.DATE_MVT AS date_calcul,
				r.PRIME_EPARGNIE AS contribution_epargne,
				q.CODE_AGENCE,
				q.NUMERO_POLICE,
				q.TERME_COMPTANT,
				q.ETAT_MVT,
				p.NBR_QUITTANCE_FRAIS,
				ROW_NUMBER() OVER (
					PARTITION BY q.NUMERO_QUITTANCE
					ORDER BY r.DATE_MVT
				) AS rang_ligne_quittance
			FROM Vue_QUITTANCIER_NEW_3 q
			INNER JOIN VIE_OPERATIONS_REGLEMENTS r
				ON q.NUMERO_QUITTANCE = r.NUMERO_QUITTANCE
			AND q.NUMERO_POLICE = r.NUMERO_POLICE
			INNER JOIN police_i p ON p.NUMERO_POLICE= q.NUMERO_POLICE
			WHERE q.ETAT_MVT = 1
			),
			etape_2 as (select e2.*,case when e2.rang_ligne_quittance = 1 AND cb.prime_deces is not null THEN cb.prime_deces / NBR_QUITTANCE_FRAIS ELSE 0 end as contribution_prevoyance from etape_2_sans_prevoyance e2, contribution_prevoyance_base cb),
			etape_2_avec_duree_plafonnee AS (
			SELECT
				e2.*,
				p.DATE_EFFET_POLICE ,
				p.duree_contrat,
				CASE
					WHEN p.duree_contrat > 20 THEN 20
					WHEN date_calcul >= '2020-06-30' THEN p.duree_contrat
					ELSE p.duree_contrat  +1
				END AS duree_plafonnee,
			DATEDIFF(MONTH, DATE_EFFET, DATE_CALCUL) / 12 + 1  AS annee_contrat
			FROM
				etape_2 e2
			INNER JOIN police_i p
					ON
				p.NUMERO_POLICE = e2.NUMERO_POLICE
			)  ,
			etape_3 AS (
			SELECT
				e3.*,
				CASE
					/* Avant 30/06/2020 */
					WHEN e3.date_calcul < '2020-06-30'
						AND e3.annee_contrat = 1
						THEN e3.contribution_epargne
							* 0.02
							* e3.duree_plafonnee
						WHEN e3.date_calcul < '2020-06-30'
						THEN e3.contribution_epargne * 0.02
					/* A partir du 30/06/2020 - agences exonérées */
						WHEN e3.date_calcul >= '2020-06-30'
						AND e3.CODE_AGENCE IN (2, 6, 9, 20)
						THEN 0
					/* A partir du 30/06/2020 - autres agences */
						WHEN e3.date_calcul >= '2020-06-30'
							AND date_effet < '2019-02-01'
							AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
						THEN e3.contribution_epargne
							* 0.0175
							WHEN e3.date_calcul >= '2020-06-30'
								AND date_effet >= '2019-02-01'
								AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
									AND e3.annee_contrat = 1
						THEN e3.contribution_epargne
							* 0.01
							* e3.duree_plafonnee
									WHEN e3.date_calcul >= '2020-06-30'
									AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
										AND e3.annee_contrat = 2
						THEN e3.contribution_epargne
							* 0.005
							* e3.duree_plafonnee
										WHEN e3.date_calcul >= '2020-06-30'
										AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
											AND e3.annee_contrat = 3
						THEN e3.contribution_epargne * 0.05
											WHEN e3.date_calcul >= '2020-06-30'
											AND e3.CODE_AGENCE NOT IN (2, 6, 9, 20)
												AND e3.annee_contrat >= 4
						THEN e3.contribution_epargne * 0.0175
												ELSE 0
											END AS chargement_acquisition
										FROM
											etape_2_avec_duree_plafonnee e3
			), 
			etape_4 as (
			SELECT
				NUMERO_QUITTANCE,
				DATE_EFFET,
				date_calcul,
				CODE_AGENCE,
				NUMERO_POLICE,
				annee_contrat,
				duree_contrat,
				duree_plafonnee,
				contribution_epargne,
				chargement_acquisition,
				contribution_epargne - chargement_acquisition as contribution_nette,
				contribution_prevoyance,
				rang_ligne_quittance
			FROM
				etape_3) ,
			/*Ajout des ligne séparatrice debut chaque année + ligne 30/06/2020*/
			etape_5 as (
			select
				*
			from
				etape_4
			UNION
			SELECT 
				'' as NUMERO_QUITTANCE,
				null as DATE_EFFET,
				DATEFROMPARTS(YEAR(date_calcul)+1, 1,1) as date_calcul,
				'' as CODE_AGENCE,
				'' as NUMERO_POLICE,
				'' as annee_contrat,
				'' as duree_contrat,
				'' as duree_plafonnee,
				null as contribution_epargne,
				null as chargement_acquisition,
				null as contribution_nette,
				null as contribution_prevoyance,
				1 AS rang_ligne_quittance
			FROM
				etape_4 d
			WHERE
				NOT EXISTS (
				SELECT
					1
				FROM
					etape_4 x
				WHERE
					x.date_calcul = DATEFROMPARTS(YEAR(d.date_calcul)+ 1, 1, 1)
			)
			UNION
			SELECT 
				'' as NUMERO_QUITTANCE,
				null as DATE_EFFET,
				DATEFROMPARTS(2020, 6, 30) as date_calcul,
				'' as CODE_AGENCE,
				'' as NUMERO_POLICE,
				'' as annee_contrat,
				'' as duree_contrat,
				'' as duree_plafonnee,
				null as contribution_epargne,
				null as chargement_acquisition,
				null as contribution_nette,
				null as contribution_prevoyance,
				1 as rang_ligne_quittance 
			FROM
				etape_4 d
			WHERE
				DATEFROMPARTS(2020, 6, 30)> d.DATE_EFFET
					AND NOT EXISTS (
					SELECT
						1
					FROM
						etape_4 x
					WHERE
						x.date_calcul = DATEFROMPARTS(2020, 6, 30)
			) ) , 
			etape_6 as (
			select
				e.*,
				LAG(date_calcul) OVER (
			ORDER BY
				date_calcul) AS date_precedente,
				ISNULL( DATEDIFF(
					DAY,
					LAG(date_calcul) OVER (ORDER BY date_calcul),
					date_calcul
				) , 0) AS periode_courue
			from
				etape_5 e), 
			etape_7_base as (
			select
				e.*,
				CASE
					WHEN date_calcul < '2020-06-30' THEN 0.006
					else 0
				end as taux2,
				CASE YEAR(DATEADD(DAY, -1, date_calcul))
					WHEN  2013 THEN 0.051
					WHEN  2014 THEN 0.0505
					WHEN  2015 THEN 0.0504
					WHEN  2016 THEN 0.0466
					WHEN  2017 THEN 0.0508
					WHEN  2018 THEN 0.0627
					WHEN  2019 THEN 0.058
					WHEN  2020 THEN 0.05
					WHEN  2021 THEN 0.0513
					WHEN  2022 THEN 0.062
					WHEN  2023 THEN 0.062
					WHEN  2024 THEN 0.0646
					WHEN  2025 THEN 0.0622
					WHEN  2025 THEN 0.05
				end as taux1,
				ROW_NUMBER() OVER (
				ORDER BY date_calcul,rang_ligne_quittance) AS rn ,
				contribution_nette as ec_avec_pb, contribution_nette as ec_sans_pb
			from
				etape_6 e) , 
		etape_7 AS (
			SELECT
				rn,rang_ligne_quittance,annee_contrat,
				taux1,
				taux2,
				NUMERO_QUITTANCE,
				DATE_EFFET,
				date_calcul,
				periode_courue,
				ISNULL(contribution_epargne,0) contribution_epargne,
				ISNULL(chargement_acquisition,0) chargement_acquisition,
				ISNULL(contribution_nette,0) contribution_nette, 
				ISNULL(contribution_prevoyance,0) contribution_prevoyance,  
			CAST ( ec_avec_pb AS DECIMAL(38,10)) ec_avec_pb,  CAST ( ec_sans_pb AS DECIMAL(38,10))   ec_sans_pb
			FROM etape_7_base
			WHERE rn = 1
			UNION ALL
			SELECT
				eb.rn,eb.rang_ligne_quittance,eb.annee_contrat,
				eb.taux1,
				eb.taux2,
				eb.NUMERO_QUITTANCE,
				eb.DATE_EFFET,
				eb.date_calcul,
				eb.periode_courue,
				ISNULL(eb.contribution_epargne,0) contribution_epargne,
				ISNULL(eb.chargement_acquisition,0) chargement_acquisition,
				ISNULL(eb.contribution_nette,0) contribution_nette,
				ISNULL(eb.contribution_prevoyance,0) contribution_prevoyance,  
			-- Garder un maximum de décimales
		CAST(
			CAST(e.ec_avec_pb AS DECIMAL(38,20)) *
			POWER(
				CAST((1.0 + eb.taux1) * (1.0 - eb.taux2) AS FLOAT),
				CAST(eb.periode_courue AS FLOAT) / 365.0
			)
			+ ISNULL(eb.contribution_nette, 0)
		AS DECIMAL(38,10)
		) AS ec_avec_pb  ,
				CAST(
			CAST(e.ec_sans_pb AS DECIMAL(38,20)) *
			POWER(
				CAST((1.0 - eb.taux2) AS FLOAT),
				CAST(eb.periode_courue AS FLOAT) / 365.0
			)
			+ ISNULL(eb.contribution_nette, 0)
		AS DECIMAL(38,10)
		) AS ec_sans_pb
			FROM etape_7 e
			INNER JOIN etape_7_base eb
				ON eb.rn = e.rn + 1
		)
		SELECT  CASE WHEN annee_contrat =0 THEN 
		CONVERT(VARCHAR(10), DATEFROMPARTS(YEAR(CAST(date_calcul AS DATETIME)) - 1, 12, 31), 103) ELSE 
		CONVERT(VARCHAR(10), date_calcul, 103) end  date_encaissement  , contribution_prevoyance + contribution_epargne as contributionEncaisse ,contribution_prevoyance as contributionPrevoyance, contribution_epargne as contributionEpargne, 	taux1	*100 as tauxPb ,	ec_avec_pb	AS ecAvecPb
		FROM etape_7
		ORDER BY rn,rang_ligne_quittance
		OPTION (MAXRECURSION 0, RECOMPILE)
	"""
, nativeQuery = true)
List<PoliceVieLettreDto> findLettreEpargneInfo(@Param("numeroPolice") String numeroPolice);
}