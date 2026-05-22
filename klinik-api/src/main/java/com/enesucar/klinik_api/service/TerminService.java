package com.enesucar.klinik_api.service;

import com.enesucar.klinik_api.dto.TerminRequest;
import com.enesucar.klinik_api.dto.TerminResponse;
import com.enesucar.klinik_api.entity.Termin;
import com.enesucar.klinik_api.exception.TerminNotFoundException;
import com.enesucar.klinik_api.repository.TerminRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TerminService {

    private final TerminRepository terminRepository;

    public TerminService(TerminRepository terminRepository) {
        this.terminRepository = terminRepository;
    }

    public List<TerminResponse> alleTermine() {
        return terminRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
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

    public TerminResponse terminFinden(Long id) {  //Endpoint get
        Termin termin = terminRepository.findById(id)
                .orElseThrow(() -> new TerminNotFoundException(id));
        return toResponse(termin);
    }


    public TerminResponse terminAktualisieren(Long id, TerminRequest request) { //Endpoint update
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