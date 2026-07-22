package com.enesucar.klinik_api.exception;

public class TerminNotFoundException extends RuntimeException{
    
    public TerminNotFoundException(Long id){
        super("Termin nicht gefunden mit ID: " + id);
    }
}
