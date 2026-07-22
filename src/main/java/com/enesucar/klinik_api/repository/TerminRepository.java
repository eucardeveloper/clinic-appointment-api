package com.enesucar.klinik_api.repository;

import com.enesucar.klinik_api.entity.Termin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TerminRepository extends JpaRepository <Termin, Long>{

}
