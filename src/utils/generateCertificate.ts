import { jsPDF } from "jspdf";
import { Student, Class, Campus, SchoolConfig } from "../types";

/** Load image asynchronously via crossOrigin */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

export async function generateCertificate(
  student: Student,
  selectedClass?: Class,
  selectedCampus?: Campus,
  schoolConfig?: SchoolConfig | null
) {
  try {
    // Landscape A4 for premium official look
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const W = 297;   // total width
    const H = 210;   // total height
    const cx = W / 2; // center x

    // ── Theme Colors ──
    const themeColorMap: Record<string, [number, number, number]> = {
      blue:    [37,  99, 235],
      emerald: [16, 185, 129],
      rose:    [244,  63,  94],
      amber:   [245, 158,  11],
      slate:   [55,   65,  81]
    };
    const primary = themeColorMap[schoolConfig?.themeColor || "blue"];
    const gold: [number, number, number] = [197, 160, 89];
    const textDark: [number, number, number] = [30, 41, 59];
    const textMuted: [number, number, number] = [100, 116, 139];

    // ── Load Logo ──
    let logoImg: HTMLImageElement | null = null;
    if (schoolConfig?.logoUrl) {
      try { logoImg = await loadImage(schoolConfig.logoUrl); } catch (_) {}
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. WATERMARK  — center, very low opacity logo
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (logoImg) {
      try {
        doc.saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage(logoImg, "PNG", cx - 40, H / 2 - 40, 80, 80);
        doc.restoreGraphicsState();
      } catch (_) {}
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. BORDERS  — double elegant frame
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Outer primary color band (top & bottom thin bands)
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, W, 3.5, "F");
    doc.rect(0, H - 3.5, W, 3.5, "F");

    // Main outer border
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.8);
    doc.rect(6, 6, W - 12, H - 12);

    // Inner gold border
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.35);
    doc.rect(9, 9, W - 18, H - 18);

    // Gold corner accents
    const corners = [
      [9, 9],
      [W - 9, 9],
      [9, H - 9],
      [W - 9, H - 9]
    ] as [number, number][];
    doc.setLineWidth(1.4);
    corners.forEach(([x, y]) => {
      const sx = x === 9 ? 1 : -1;
      const sy = y === 9 ? 1 : -1;
      doc.line(x, y, x + sx * 10, y);
      doc.line(x, y, x, y + sy * 10);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. SIDE DECORATIVE BANDS  (left & right)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 3.5, H, "F");
    doc.rect(W - 3.5, 0, 3.5, H, "F");

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. HEADER  — Logo + School Name + Slogan
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let headerY = 16;

    // Logo centered at top
    if (logoImg) {
      try {
        doc.addImage(logoImg, "PNG", cx - 14, headerY, 28, 28);
        headerY += 32;
      } catch (_) {
        headerY += 4;
      }
    } else {
      headerY += 4;
    }

    // School name
    const schoolName = schoolConfig?.name?.toUpperCase() || "ÉCOLE DE LANGUES";
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(schoolName, cx, headerY, { align: "center" });
    headerY += 6;

    // Slogan
    const slogan = schoolConfig?.slogan || "L'excellence linguistique à votre portée";
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(slogan, cx, headerY, { align: "center" });
    headerY += 4;

    // Thin gold separator
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.6);
    doc.line(cx - 60, headerY, cx + 60, headerY);
    headerY += 7;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. TITLE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const titleText = (schoolConfig?.certificateTitle || "ATTESTATION DE SÉJOUR & RÉUSSITE").toUpperCase();
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(titleText, cx, headerY, { align: "center" });
    headerY += 4;

    // Underline with gold dashes
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(1.0);
    doc.line(cx - 55, headerY, cx + 55, headerY);
    headerY += 9;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. BODY TEXT — dynamic with student name bold
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const studentFullName = `${student.firstName.toUpperCase()} ${student.lastName.toUpperCase()}`;
    let rawBody =
      schoolConfig?.certificateBody ||
      "Nous soussignés, {ecole_nom}, certifions par la présente que l'élève {nom_etudiant} a suivi avec assiduité et succès ses cours de perfectionnement linguistique au sein de notre établissement. Cette attestation lui est délivrée pour servir et valoir ce que de droit.";

    const formattedBody = rawBody
      .replace(/{nom_etudiant}/g, studentFullName)
      .replace(/{student_name}/g, studentFullName)
      .replace(/{ecole_nom}/g, schoolConfig?.name || schoolName)
      .replace(/{school_name}/g, schoolConfig?.name || schoolName);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const bodyLines = doc.splitTextToSize(formattedBody, 220);
    bodyLines.forEach((line: string) => {
      doc.text(line, cx, headerY, { align: "center" });
      headerY += 7.5;
    });

    // Class details (optional)
    if (selectedClass) {
      headerY += 2;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(primary[0], primary[1], primary[2]);
      const classText = `Niveau : ${selectedClass.language} — ${selectedClass.level}  ·  Horaire : ${selectedClass.period}`;
      doc.text(classText, cx, headerY, { align: "center" });
      headerY += 5;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 7. FOOTER SIGNATURE BLOCK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const footerY = H - 46;

    // Thin gold separator
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.5);
    doc.line(25, footerY, W - 25, footerY);

    // Left: Date & Place
    const location = selectedCampus?.name || "Campus Principal";
    const dateStr = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("Fait à :", 28, footerY + 8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(location, 28, footerY + 13);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Le ${dateStr}`, 28, footerY + 18);

    // Center: Security stamp placeholder (circular seal)
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.5);
    doc.circle(cx, footerY + 12, 14, "S");
    doc.setLineWidth(0.25);
    doc.circle(cx, footerY + 12, 12, "S");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text("CACHET", cx, footerY + 10, { align: "center" });
    doc.text("OFFICIEL", cx, footerY + 14.5, { align: "center" });

    // Right: Signature area
    const sigX = W - 80;
    const sigBoxW = 65;
    const sigBoxH = 22;

    // Signature label
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const sigLabel = schoolConfig?.certificateSignatory || "La Direction Académique";
    doc.text(sigLabel, W - 28, footerY + 6, { align: "right" });

    // Signature box (dashed border)
    doc.setDrawColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1, 1.5], 0);
    doc.rect(sigX - 2, footerY + 8, sigBoxW, sigBoxH);
    doc.setLineDashPattern([], 0); // Reset dash

    // Dotted signature line inside box
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.5);
    doc.line(sigX + 4, footerY + 26, sigX + sigBoxW - 6, footerY + 26);

    // Signature guide text
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("Signature et Cachet", cx + 50, footerY + 30, { align: "center" });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 8. SECURITY IDENTIFIER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const certHash = `CERT-${student.id.substring(student.id.length - 6).toUpperCase()}-${Date.now().toString().slice(-5)}`;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(186, 196, 210);
    doc.text(`Réf. authentification : ${certHash}`, cx, H - 7, { align: "center" });
    doc.text("Ce document officiel certifie la scolarité et l'assiduité de l'étudiant au sein de l'établissement.", cx, H - 4, { align: "center" });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 9. SAVE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const safeFirst = student.firstName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const safeLast  = student.lastName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    doc.save(`certificat_${safeFirst}_${safeLast}.pdf`);
  } catch (err) {
    console.error("Erreur lors de la génération du certificat PDF:", err);
  }
}
