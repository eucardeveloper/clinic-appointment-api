package com.enesucar.klinik_api.service;

import com.enesucar.klinik_api.dto.TerminRequest;
import com.enesucar.klinik_api.dto.TerminResponse;
import com.enesucar.klinik_api.entity.Termin;
import com.enesucar.klinik_api.exception.TerminNotFoundException;
import com.enesucar.klinik_api.repository.TerminRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class TerminService {

    private final TerminRepository terminRepository;

    public TerminService(TerminRepository terminRepository) {
        this.terminRepository = terminRepository;
    }

    public Page<TerminResponse> alleTermine(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return terminRepository.findAll(pageable)
                .map(this::toResponse);
    }

    public TerminResponse terminSpeichern(TerminRequest request) {
        Termin termin = new Termin();
        termin.setPatientName(request.getPatientName());
        termin.setArztName(request.getArztName());
        termin.setTerminZeit(request.getTerminZeit());
        termin.setAbteilung(request.getAbteilung());
        Termin gespeichert = terminRepository.save(termin);
        return toResponse(gespeichert);
    }

    public TerminResponse terminFinden(Long id) {
        Termin termin = terminRepository.findById(id)
                .orElseThrow(() -> new TerminNotFoundException(id));
        return toResponse(termin);
    }

    public TerminResponse terminAktualisieren(Long id, TerminRequest request) {
        Termin termin = terminRepository.findById(id)
                .orElseThrow(() -> new TerminNotFoundException(id));
        termin.setPatientName(request.getPatientName());
        termin.setArztName(request.getArztName());
        termin.setTerminZeit(request.getTerminZeit());
        termin.setAbteilung(request.getAbteilung());
        Termin gespeichert = terminRepository.save(termin);
        return toResponse(gespeichert);
    }

    public void terminLoeschen(Long id) {
        if (!terminRepository.existsById(id)) {
            throw new TerminNotFoundException(id);
        }
        terminRepository.deleteById(id);
    }

    private TerminResponse toResponse(Termin termin) {
        TerminResponse response = new TerminResponse();
        response.setId(termin.getId());
        response.setPatientName(termin.getPatientName());
        response.setArztName(termin.getArztName());
        response.setTerminZeit(termin.getTerminZeit());
        response.setAbteilung(termin.getAbteilung());
        return response;
    }
}