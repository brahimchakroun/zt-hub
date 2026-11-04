package com.zt.hub.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import jakarta.persistence.EntityManagerFactory;

import javax.sql.DataSource;


@Configuration
@EnableJpaRepositories(
    basePackages = "com.zt.hub.repository.proassure",
    entityManagerFactoryRef = "proassureEntityManagerFactory",
    transactionManagerRef = "proassureTransactionManager"
)
public class ProAssureDbConfig {

    @Bean
    @ConfigurationProperties("spring.datasource.proassure")
    public DataSourceProperties proassureDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource proassureDataSource() {
        return proassureDataSourceProperties()
                .initializeDataSourceBuilder()
                .build();
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean proassureEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("proassureDataSource") DataSource dataSource) {

        return builder
                .dataSource(dataSource)
                .packages("com.zt.hub.entity.proassure")
                .persistenceUnit("proassure")
                .build();
    }

    @Bean
    public PlatformTransactionManager proassureTransactionManager(
            @Qualifier("proassureEntityManagerFactory")
            EntityManagerFactory entityManagerFactory) {

        return new JpaTransactionManager(entityManagerFactory);
    }
}