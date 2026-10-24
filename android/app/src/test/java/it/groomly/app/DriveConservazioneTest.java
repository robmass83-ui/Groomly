package it.groomly.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class DriveConservazioneTest {
    private static DriveConservazione.Voce zip(String id, String giorno, long created) {
        return new DriveConservazione.Voce(id, "Groomly Backup completo – Pelosetti – " + giorno + ".zip", created);
    }

    @Test
    public void dieciGiorniNonSiToccano() {
        List<DriveConservazione.Voce> voci = new ArrayList<>();
        for (int i = 1; i <= 10; i++) voci.add(zip("id" + i, String.format("2026-10-%02d", i), i));
        assertTrue(DriveConservazione.daEliminare(voci).isEmpty());
    }

    @Test
    public void lUndicesimoGiornoPiuVecchioEsce() {
        List<DriveConservazione.Voce> voci = new ArrayList<>();
        for (int i = 1; i <= 11; i++) voci.add(zip("id" + i, String.format("2026-10-%02d", i), i));
        assertEquals(Arrays.asList("id1"), DriveConservazione.daEliminare(voci));
    }

    @Test
    public void stessoNomeTieneIlPiuRecente() {
        List<DriveConservazione.Voce> voci = Arrays.asList(
            zip("vecchio", "2026-10-23", 10),
            zip("nuovo", "2026-10-23", 20)
        );
        assertEquals(Arrays.asList("vecchio"), DriveConservazione.daEliminare(voci));
    }

    @Test
    public void aParitaDiIstanteTieneLidMaggiore() {
        List<DriveConservazione.Voce> voci = Arrays.asList(
            zip("a", "2026-10-23", 10),
            zip("b", "2026-10-23", 10)
        );
        assertEquals(Arrays.asList("a"), DriveConservazione.daEliminare(voci));
    }

    @Test
    public void unFileEstraneoNonEsce() {
        List<DriveConservazione.Voce> voci = new ArrayList<>();
        for (int i = 1; i <= 11; i++) voci.add(zip("id" + i, String.format("2026-10-%02d", i), i));
        voci.add(new DriveConservazione.Voce("foto", "profilo.jpg", 1));
        voci.add(new DriveConservazione.Voce("altro", "Registro Groomly.xlsx", 1));
        List<String> via = DriveConservazione.daEliminare(voci);
        assertEquals(Arrays.asList("id1"), via);
        assertFalse(via.contains("foto"));
        assertFalse(via.contains("altro"));
    }

    @Test
    public void senzaDataEscePrimaDiUnGiornoDatato() {
        List<DriveConservazione.Voce> voci = new ArrayList<>();
        for (int i = 1; i <= 10; i++) voci.add(zip("id" + i, String.format("2026-10-%02d", i + 1), i));
        voci.add(new DriveConservazione.Voce("nuda", "Groomly Backup completo – Pelosetti.zip", 999));
        assertEquals(Arrays.asList("nuda"), DriveConservazione.daEliminare(voci));
    }

    @Test
    public void lIstanteLeggeIlTempoDiDrive() {
        assertEquals(0, DriveUpload.istante(""));
        assertEquals(0, DriveUpload.istante("non-una-data"));
        assertTrue(DriveUpload.istante("2026-10-23T18:30:00.000Z") > DriveUpload.istante("2026-10-22T18:30:00Z"));
    }

    @Test
    public void daMostrareTieneIDieciPiuNuovi() {
        List<DriveConservazione.Voce> voci = new ArrayList<>();
        for (int i = 1; i <= 11; i++) voci.add(zip("id" + i, String.format("2026-10-%02d", i), i));
        voci.add(new DriveConservazione.Voce("foto", "profilo.jpg", 99));
        voci.add(zip("vecchio", "2026-10-11", 1));
        List<DriveConservazione.Voce> mostrate = DriveConservazione.daMostrare(voci);
        assertEquals(10, mostrate.size());
        assertEquals("id11", mostrate.get(0).id);
        assertEquals("id2", mostrate.get(9).id);
        assertFalse(mostrate.stream().anyMatch(voce -> voce.id.equals("id1") || voce.id.equals("foto") || voce.id.equals("vecchio")));
    }

    @Test
    public void tieneUnaCopiaAlMeseDentroLAnno() {
        List<DriveConservazione.Voce> voci = new ArrayList<>();
        for (int i = 2; i <= 11; i++) voci.add(zip("ott" + i, String.format("2026-10-%02d", i), i));
        voci.add(zip("nov", "2025-11-01", 1));
        voci.add(zip("vecchio", "2024-01-01", 1));
        List<String> via = DriveConservazione.daEliminare(voci);
        assertFalse(via.contains("nov"));
        assertTrue(via.contains("vecchio"));
    }

    @Test
    public void ilGiornoSiLeggeDopoLUltimoTrattino() {
        assertEquals("2026-10-23", DriveConservazione.giorno("Groomly Backup completo – Pelosetti – 2026-10-23.zip"));
        assertEquals("", DriveConservazione.giorno("Groomly Backup completo – Pelosetti.zip"));
    }
}
