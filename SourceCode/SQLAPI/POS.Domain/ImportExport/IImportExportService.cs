using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace POS.Domain.ImportExport
{
    public interface IImportExportService<T> where T : class
    {
        /// <summary>
        /// Generates a template file for import
        /// </summary>
        Task<byte[]> GenerateTemplateAsync(FileFormat format);
        
        /// <summary>
        /// Imports data from a file
        /// </summary>
        Task<ImportResult<T>> ImportAsync(Stream fileStream, FileFormat format);
        
        /// <summary>
        /// Validates import data without saving
        /// </summary>
        Task<ImportResult<T>> ValidateImportAsync(Stream fileStream, FileFormat format);
        
        /// <summary>
        /// Exports data to a file
        /// </summary>
        Task<byte[]> ExportAsync(ExportOptions options, FileFormat format);
    }

    public enum FileFormat
    {
        CSV,
        Excel
    }

    public class ImportResult<T>
    {
        public int TotalRecords { get; set; }
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public List<T> SuccessfulRecords { get; set; } = new List<T>();
        public List<ImportError> Errors { get; set; } = new List<ImportError>();
        public bool IsSuccess => FailureCount == 0;
    }

    public class ImportError
    {
        public int RowNumber { get; set; }
        public string FieldName { get; set; }
        public string ErrorMessage { get; set; }
        public string RowData { get; set; }
    }

    public class ExportOptions
    {
        public List<Guid> SelectedIds { get; set; }
        public Dictionary<string, string> Filters { get; set; }
        public bool ExportAll { get; set; }
        public List<string> ColumnsToExport { get; set; }
    }
}
