INSERT INTO ZT_PAGE
(page_code, label, group_name, icon, display_order, active, description, url_root, menu_code)
VALUES(N'assurance.vie.lettre-epargne', N'Lettre épargne', N'assurance vie', N'envelope', 82, 1, N'Lettre Epargne assurance vie', N'assurance-vie/lettre-epargne', N'assuranceVie');


INSERT INTO ZT_ROLE_PAGE
(role_code, page_code)
VALUES(N'ADMIN', N'assurance.vie.lettre-epargne');