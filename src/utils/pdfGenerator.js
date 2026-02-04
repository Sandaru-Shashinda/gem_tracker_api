import PDFDocument from "pdfkit"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const createPDFReport = async (gem, qrCode) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 })
      const filename = `report_${gem.gemId}.pdf`
      const reportsDir = path.join(__dirname, "../../reports")

      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir)
      }

      const filePath = path.join(reportsDir, filename)
      const stream = fs.createWriteStream(filePath)

      doc.pipe(stream)

      // Gold/Gray Professional Header
      doc.rect(0, 0, doc.page.width, 100).fill("#f8fafc")
      doc
        .fillColor("#854d0e")
        .fontSize(26)
        .text("GEMOLOGICAL REPORT OF CEYLON", 50, 40, { characterSpacing: 1 })

      doc.fillColor("#64748b").fontSize(10).text("Date:", 50, 120)
      doc.fillColor("#0f172a").fontSize(10).text(new Date().toLocaleDateString("en-GB"), 150, 120)

      doc.fillColor("#64748b").fontSize(10).text("GRC Number:", 50, 135)
      doc.fillColor("#0f172a").fontSize(10).text(gem.gemId, 150, 135)

      const drawRow = (label, value, y) => {
        doc.fillColor("#64748b").fontSize(11).text(label, 50, y)
        doc
          .fillColor("#0f172a")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(value || "N/A", 250, y)
        doc.font("Helvetica")
        // Add dotted line
        const textWidth = doc.widthOfString(label)
        doc
          .strokeColor("#e2e8f0")
          .dash(2, { space: 2 })
          .moveTo(50 + textWidth + 10, y + 8)
          .lineTo(240, y + 8)
          .stroke()
      }

      let currentY = 160
      drawRow("Color:", gem.color, currentY)
      currentY += 20
      drawRow("Weight:", `${gem.weight} ct`, currentY)
      currentY += 20
      drawRow("Shape:", gem.finalApproval.finalObservations.shape, currentY)
      currentY += 20
      drawRow("Cut:", gem.finalApproval.finalObservations.cut, currentY)
      currentY += 20
      drawRow("Cluster Measurements:", gem.finalApproval.finalObservations.cluster, currentY)
      currentY += 20
      drawRow("Stone Measurements:", gem.finalApproval.finalObservations.stone, currentY)
      currentY += 20
      drawRow("Transparency:", gem.finalApproval.finalObservations.transparency, currentY)
      currentY += 20
      drawRow("Species:", gem.finalApproval.finalObservations.species, currentY)
      currentY += 20
      drawRow("Variety:", gem.finalApproval.finalObservations.variety, currentY)
      currentY += 25

      doc.moveDown()
      currentY += 10

      // Secondary Table
      const drawField = (label, value, x, y) => {
        doc.fillColor("#64748b").fontSize(10).text(label, x, y)
        doc
          .fillColor("#0f172a")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(value || "N/A", x + 100, y)
        doc.font("Helvetica")
      }

      drawField("Geographic Origin:", gem.finalApproval.finalObservations.origin, 50, currentY)
      currentY += 18
      drawField("Cutting:", gem.finalApproval.finalObservations.cuttingGrade, 50, currentY)
      currentY += 18
      drawField("Polishing:", gem.finalApproval.finalObservations.polishingGrade, 50, currentY)
      currentY += 18
      drawField("Proportion:", gem.finalApproval.finalObservations.proportionGrade, 50, currentY)
      currentY += 18
      drawField("Clarity:", gem.finalApproval.finalObservations.clarityGrade, 50, currentY)
      currentY += 18
      drawField("Comments:", gem.finalApproval.finalObservations.comments, 50, currentY)
      currentY += 18
      drawField("Special Note:", gem.finalApproval.finalObservations.specialNote, 50, currentY)
      currentY += 30

      // Item Description Section
      doc
        .fillColor("#0f172a")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Item Description:", 50, currentY)
      currentY += 15
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(gem.finalApproval.itemDescription || gem.itemDescription, 50, currentY, {
          width: 500,
          align: "justify",
          lineGap: 3,
        })

      currentY = doc.y + 10
      doc
        .fillColor("#0f172a")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`Weight: ${gem.weight} ct.`, 50, currentY)

      // Footer
      const footerY = doc.page.height - 140

      // Add Gem Image if exists
      const addImage = async () => {
        if (gem.imageUrl) {
          try {
            let imageSource
            if (gem.imageUrl.startsWith("http")) {
              const response = await fetch(gem.imageUrl)
              const arrayBuffer = await response.arrayBuffer()
              imageSource = Buffer.from(arrayBuffer)
            } else {
              const imagePath = path.join(__dirname, "../../", gem.imageUrl)
              if (fs.existsSync(imagePath)) {
                imageSource = imagePath
              }
            }

            if (imageSource) {
              // Draw a border for the image
              doc.rect(350, 160, 200, 200).strokeColor("#e2e8f0").stroke()
              doc.image(imageSource, 355, 165, {
                fit: [190, 190],
                align: "center",
                valign: "center",
              })
              doc
                .fillColor("#94a3b8")
                .fontSize(8)
                .text("Photograph", 350, 365, { width: 200, align: "center" })
            }
          } catch (err) {
            console.error("Error adding image to PDF:", err)
          }
        }
      }

      // Execute PDF generation steps
      const generate = async () => {
        await addImage()

        if (qrCode) {
          doc.image(qrCode, doc.page.width / 2 - 50, footerY, { width: 100 })
        }

        doc
          .fillColor("#94a3b8")
          .fontSize(9)
          .text("For complete terms and updates, visit www.grc.lk", 0, doc.page.height - 40, {
            align: "center",
          })

        doc.end()
      }

      generate().catch(reject)

      stream.on("finish", () => {
        resolve(`/reports/${filename}`)
      })
    } catch (error) {
      reject(error)
    }
  })
}
