using OfficeOpenXml;
using OfficeOpenXml.Style;
using System;
using System.Drawing;
using System.IO;

namespace TempGen
{
    class Program
    {
        static void Main(string[] args)
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            var outputPath = args.Length > 0 ? args[0] : "Supplier_Template.xlsx";
            Console.WriteLine($"Generating template to: {outputPath}");

            using (var package = new ExcelPackage())
            {
                var instructionsSheet = package.Workbook.Worksheets.Add("Instructions");
                instructionsSheet.Cells["A1"].Value = "Supplier Import Template";
                instructionsSheet.Cells["A1"].Style.Font.Size = 16;
                instructionsSheet.Cells["A1"].Style.Font.Bold = true;

                instructionsSheet.Cells["A3"].Value = "Instructions:";
                instructionsSheet.Cells["A4"].Value = "1. Fill in the 'Suppliers' sheet with your data";
                instructionsSheet.Cells["A5"].Value = "2. Required fields are marked with * in header";
                instructionsSheet.Cells["A6"].Value = "3. Billing Address, City, and Country are required";

                var suppliersSheet = package.Workbook.Worksheets.Add("Suppliers");

                var headers = new[] { "Supplier Name*", "Contact Person", "Email", "Mobile No*",
                                      "Phone No", "Website", "Tax Number", "Billing Address*",
                                      "Billing City*", "Billing Country*", "Shipping Address",
                                      "Shipping City", "Shipping Country", "Description" };

                for (int i = 0; i < headers.Length; i++)
                {
                    var cell = suppliersSheet.Cells[1, i + 1];
                    cell.Value = headers[i];
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    cell.Style.Fill.BackgroundColor.SetColor(Color.LightCoral);
                }

                suppliersSheet.Cells["A2"].Value = "ABC Suppliers Ltd";
                suppliersSheet.Cells["B2"].Value = "Ahmed Ali";
                suppliersSheet.Cells["C2"].Value = "info@abc.com";
                suppliersSheet.Cells["D2"].Value = "+92-321-9876543";
                suppliersSheet.Cells["E2"].Value = "042-98765432";
                suppliersSheet.Cells["F2"].Value = "www.abc.com";
                suppliersSheet.Cells["G2"].Value = "9876543-2";
                suppliersSheet.Cells["H2"].Value = "456 Industrial Area";
                suppliersSheet.Cells["I2"].Value = "Karachi";
                suppliersSheet.Cells["J2"].Value = "Pakistan";
                suppliersSheet.Cells["K2"].Value = "456 Industrial Area";
                suppliersSheet.Cells["L2"].Value = "Karachi";
                suppliersSheet.Cells["M2"].Value = "Pakistan";
                suppliersSheet.Cells["N2"].Value = "Preferred supplier";

                suppliersSheet.Cells.AutoFitColumns();

                package.SaveAs(new FileInfo(outputPath));
            }

            Console.WriteLine("Template generated successfully.");
        }
    }
}
