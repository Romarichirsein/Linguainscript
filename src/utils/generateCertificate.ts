import { jsPDF } from "jspdf";
import { Student, Class, Campus, SchoolConfig } from "../types";

export function generateCertificate(
  student: Student,
  selectedClass?: Class,
  selectedCampus?: Campus,
  schoolConfig?: SchoolConfig | null
) {
  try {
    // Landscape A4 size is very premium for official certificates
    // A4 Landscape: 297mm width x 210mm height
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const width = 297;
    const height = 210;

    // Color presets matching schoolConfig.themeColor
    const themeColorMap: Record<string, [number, number, number]> = {
      blue: [37, 99, 235],      // Blue 600
      emerald: [16, 185, 129],  // Emerald 600
      rose: [244, 63, 94],      // Rose 600
      amber: [245, 158, 11],     // Amber 500
      slate: [55, 65, 81]       // Slate 700
    };

    const primaryColor = themeColorMap[schoolConfig?.themeColor || "blue"];
    const textColor = [30, 41, 59]; // Slate 800
    const goldColor = [197, 160, 89]; // Warm luxury gold for certificate credentials

    // 1. Draw elegant double certificate frame border
    // Outer border (thin)
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, width - 16, height - 16);

    // Inner border (double thin / gold style)
    doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setLineWidth(0.35);
    doc.rect(10.5, 10.5, width - 21, height - 21);

    // Elegant corner accents
    const corners = [
      { x: 10.5, y: 10.5, dx1: 8, dy1: 0, dx2: 0, dy2: 8 }, // Top Left
      { x: width - 10.5, y: 10.5, dx1: -8, dy1: 0, dx2: 0, dy2: 8 }, // Top Right
      { x: 10.5, y: height - 10.5, dx1: 8, dy1: 0, dx2: 0, dy2: -8 }, // Bottom Left
      { x: width - 10.5, y: height - 10.5, dx1: -8, dy1: 0, dx2: 0, dy2: -8 } // Bottom Right
    ];

    doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setLineWidth(1.2);
    corners.forEach(c => {
      doc.line(c.x, c.y, c.x + c.dx1, c.y + c.dy1);
      doc.line(c.x, c.y, c.x + c.dx2, c.y + c.dy2);
    });

    // Watermark/Central Shield decorative vector (soft grey/gold opacity representation)
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.ellipse(width / 2, height / 2 + 10, 45, 30, "S");
    doc.ellipse(width / 2, height / 2 + 10, 41, 26, "S");

    // 2. School Brand Info
    let logoY = 18;
    if (schoolConfig?.logoUrl) {
      try {
        // Center the logo
        doc.addImage(schoolConfig.logoUrl, "JPEG", width / 2 - 12, logoY, 24, 24);
        logoY += 30;
      } catch (e) {
        logoY = 22;
      }
    } else {
      logoY = 25;
    }

    // School Name & Slogan Centered
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(schoolConfig?.name?.toUpperCase() || "LINGUAINSCRIPT", width / 2, logoY, { align: "center" });

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(115, 125, 140);
    doc.text(schoolConfig?.slogan || "L'excellence linguistique à portée de main", width / 2, logoY + 6, { align: "center" });

    const titleY = logoY + 22;

    // 3. Document Title
    const titleText = schoolConfig?.certificateTitle?.toUpperCase() || "ATTESTATION DE SÉJOUR & RÉUSSITE";
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(titleText, width / 2, titleY, { align: "center" });

    // Golden underline below title
    doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setLineWidth(1.0);
    doc.line(width / 2 - 50, titleY + 3, width / 2 + 50, titleY + 3);

    // 4. Dynamic body text rendering
    const studentFullName = `${student.firstName.toUpperCase()} ${student.lastName.toUpperCase()}`;
    const schoolName = schoolConfig?.name || "inscriptions de l'école";
    
    let rawBody = schoolConfig?.certificateBody || "Nous soussignés, {ecole_nom}, certifions par la présente que l'élève {nom_etudiant} a suivi avec succès tous ses cours de perfectionnement linguistique au sein de notre établissement.";
    
    // Replace placeholders
    let formattedBodyText = rawBody
      .replace(/{nom_etudiant}/g, studentFullName)
      .replace(/{student_name}/g, studentFullName)
      .replace(/{ecole_nom}/g, schoolName)
      .replace(/{school_name}/g, schoolName);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    // Split text into multiple lines for landscape page sizing (width - 60mm margins)
    const bodyLines = doc.splitTextToSize(formattedBodyText, 220);
    const bodyStartY = titleY + 16;
    
    // Render lines centered
    let currentY = bodyStartY;
    for (let i = 0; i < bodyLines.length; i++) {
      doc.text(bodyLines[i], width / 2, currentY, { align: "center" });
      currentY += 8;
    }

    // Optional Class details
    if (selectedClass) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const classDetailText = `Niveau Programmé : ${selectedClass.language} ${selectedClass.level}  |  Période journalière : ${selectedClass.period}`;
      doc.text(classDetailText, width / 2, currentY + 3, { align: "center" });
    }

    // 5. Date & Authorizations footer block
    const footerStartY = 162;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    
    // Date and location on bottom-left
    const location = selectedCampus ? selectedCampus.name : "Centre Académique Principal";
    const dateText = `Fait à ${location},\nle ${new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })}`;
    doc.text(dateText, 25, footerStartY);

    // Signatory on bottom-right
    const signatoryText = schoolConfig?.certificateSignatory || "La Direction Académique";
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(signatoryText, width - 25, footerStartY, { align: "right" });

    // Dotted line for physical signature
    doc.setDrawColor(186, 195, 208);
    doc.setLineWidth(0.3);
    doc.line(width - 85, footerStartY + 14, width - 25, footerStartY + 14);

    // 6. Security ID and verification footer
    const certHash = `CERT-${student.id.substring(student.id.length - 4).toUpperCase()}-${Date.now().toString().substring(8)}`;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 160, 175);
    doc.text(`Identifiant d'Authentification : ${certHash}`, width / 2, height - 16, { align: "center" });
    doc.text("Ce document officiel fait foi d'inscription validée et d'excellence de scolarité au sein de notre établissement.", width / 2, height - 12, { align: "center" });

    // Download / Save PDF
    const safeFirstName = student.firstName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const safeLastName = student.lastName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const fileName = `certificat_${safeFirstName}_${safeLastName}.pdf`;
    
    doc.save(fileName);
  } catch (err) {
    console.error("Critical error producing certificate PDF via jsPDF: ", err);
  }
}
