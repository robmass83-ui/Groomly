package it.groomly.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import org.junit.Test;

public class DriveFotoTest {
    @Test
    public void codiceDalNomeDellaCartella() {
        assertEquals("C0001", DriveFoto.codiceDi("C0001 - Fido - Barboncino (Rossi)"));
        assertNull(DriveFoto.codiceDi("Fido"));
        assertNull(DriveFoto.codiceDi("C0001"));
    }

    @Test
    public void pezziRestanoNellaCartella() {
        assertEquals(Arrays.asList("altre foto", "foto-01.jpg"), DriveFoto.pezzi("altre foto/foto-01.jpg"));
        assertTrue(DriveFoto.pezzi("../segreto").isEmpty());
        assertTrue(DriveFoto.pezzi("a/../b").isEmpty());
        assertTrue(DriveFoto.pezzi("").isEmpty());
    }

    @Test
    public void spostaSoloLeFotoCheNonSonoPiuNelSalone() {
        DriveFoto.Gia viva = new DriveFoto.Gia("d1", "file-a", "profilo.jpg", "cane");
        DriveFoto.Gia tolta = new DriveFoto.Gia("d2", "file-b", "profilo.jpg", "cane");
        DriveFoto.Gia giaVia = new DriveFoto.Gia("d3", "file-c", "file-c - x", "elim");
        assertEquals(
            Collections.singletonList(tolta),
            DriveFoto.daMettereVia(Arrays.asList(viva, tolta, giaVia), new HashSet<>(Collections.singletonList("file-a")), "elim")
        );
        assertFalse(DriveFoto.stessoPosto(viva, "altro", "profilo.jpg"));
        assertTrue(DriveFoto.stessoPosto(viva, "cane", "profilo.jpg"));
    }

    @Test
    public void nelCestinoIlNomePortaLid() {
        assertEquals("file-b - profilo.jpg", DriveFoto.nomeEliminate("file-b", "profilo.jpg"));
    }
}
