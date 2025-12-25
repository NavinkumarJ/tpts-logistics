package com.tpts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TptsApplication {

    public static void main(String[] args) {
        SpringApplication.run(TptsApplication.class, args);
        System.out.println("\n" +
            "╔════════════════════════════════════════════════════════════╗\n" +
            "║                                                            ║\n" +
            "║   ████████╗██████╗ ████████╗███████╗                       ║\n" +
            "║   ╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝                       ║\n" +
            "║      ██║   ██████╔╝   ██║   ███████╗                       ║\n" +
            "║      ██║   ██╔═══╝    ██║   ╚════██║                       ║\n" +
            "║      ██║   ██║        ██║   ███████║                       ║\n" +
            "║      ╚═╝   ╚═╝        ╚═╝   ╚══════╝                       ║\n" +
            "║                                                            ║\n" +
            "║   Trail Parcel Tracking System - Backend API               ║\n" +
            "║   Running on: http://localhost:8080                        ║\n" +
            "║                                                            ║\n" +
            "╚════════════════════════════════════════════════════════════╝\n"
        );
    }
}
