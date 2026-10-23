package it.groomly.app;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class DriveConservazione {
    static final int TIENI = 10;
    static final String PREFISSO = "Groomly Backup completo –";

    static final class Voce {
        final String id;
        final String name;
        final long created;

        Voce(String id, String name, long created) {
            this.id = id;
            this.name = name;
            this.created = created;
        }
    }

    private DriveConservazione() {}

    static List<String> daEliminare(List<Voce> voci) {
        List<String> via = new ArrayList<>();
        Map<String, Voce> tieni = new LinkedHashMap<>();
        if (voci == null) return via;
        for (Voce voce : voci) {
            if (voce == null || voce.id == null || voce.id.isEmpty() || !backup(voce.name)) continue;
            Voce gia = tieni.get(voce.name);
            if (gia == null) {
                tieni.put(voce.name, voce);
                continue;
            }
            if (preferisci(voce, gia)) {
                via.add(gia.id);
                tieni.put(voce.name, voce);
            } else {
                via.add(voce.id);
            }
        }
        List<Voce> vive = new ArrayList<>(tieni.values());
        vive.sort((a, b) -> {
            int giorno = giorno(b.name).compareTo(giorno(a.name));
            if (giorno != 0) return giorno;
            return Long.compare(b.created, a.created);
        });
        for (int i = TIENI; i < vive.size(); i++) via.add(vive.get(i).id);
        return via;
    }

    private static boolean preferisci(Voce candidata, Voce attuale) {
        if (candidata.created != attuale.created) return candidata.created > attuale.created;
        return candidata.id.compareTo(attuale.id) > 0;
    }

    private static boolean backup(String name) {
        return name != null && name.startsWith(PREFISSO) && name.endsWith(".zip");
    }

    static String giorno(String name) {
        int taglio = name.lastIndexOf(" – ");
        if (taglio < 0) return "";
        String resto = name.substring(taglio + 3);
        if (!resto.endsWith(".zip") || resto.length() != 14) return "";
        String data = resto.substring(0, 10);
        for (int i = 0; i < data.length(); i++) {
            char c = data.charAt(i);
            if (i == 4 || i == 7) {
                if (c != '-') return "";
            } else if (c < '0' || c > '9') {
                return "";
            }
        }
        return data;
    }
}
