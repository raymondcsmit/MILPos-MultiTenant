using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using POS.Common.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Processing;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Helper.Services
{
    public class FileStorageService : IFileStorageService
    {
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly ILogger<FileStorageService> _logger;

        public FileStorageService(IWebHostEnvironment webHostEnvironment, ILogger<FileStorageService> logger)
        {
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
        }

        public async Task<string> SaveFileAsync(string folderPath, byte[] fileContent, string fileName)
        {
            try
            {
                var directoryPath = GetWritableDirectory(folderPath);
                var fullPath = Path.Combine(directoryPath, fileName);
                await File.WriteAllBytesAsync(fullPath, fileContent);
                return fileName; // Return just the filename as the relative path logic handles the rest
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving file: {FileName}", fileName);
                throw;
            }
        }

        public async Task<string> SaveFileAsync(string folderPath, string base64Data, string fileName)
        {
            if (string.IsNullOrWhiteSpace(base64Data)) return null;

            var bytes = Convert.FromBase64String(base64Data.Split(',').LastOrDefault());
            return await SaveFileAsync(folderPath, bytes, fileName);
        }

        public async Task<string> SaveThumbnailAsync(string folderPath, string base64Data, string fileName)
        {
            if (string.IsNullOrWhiteSpace(base64Data)) return null;

            try
            {
                var directoryPath = GetWritableDirectory(folderPath);
                var fullPath = Path.Combine(directoryPath, fileName);

                var bytes = Convert.FromBase64String(base64Data.Split(',').LastOrDefault());
                using var image = Image.Load(bytes);
                image.Mutate(x => x.Resize(100, 100));
                
                using var outputStream = new MemoryStream();
                image.Save(outputStream, new PngEncoder());
                
                await File.WriteAllBytesAsync(fullPath, outputStream.ToArray());
                return fileName;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving thumbnail: {FileName}", fileName);
                throw;
            }
        }

        public void DeleteFile(string relativeFilePath)
        {
            if (string.IsNullOrWhiteSpace(relativeFilePath)) return;

            try
            {
                // Try deleting from WebRoot
                var webRootPath = Path.Combine(_webHostEnvironment.WebRootPath, relativeFilePath.TrimStart('/').TrimStart('\\'));
                if (File.Exists(webRootPath))
                {
                    File.Delete(webRootPath);
                }

                // Try deleting from AppData (fallback location)
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot", relativeFilePath.TrimStart('/').TrimStart('\\'));
                if (File.Exists(appDataPath))
                {
                    File.Delete(appDataPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error deleting file: {FilePath}", relativeFilePath);
                // Don't throw on delete failure
            }
        }

        public string GetPhysicalPath(string relativePath)
        {
            // Prefer AppData if it exists, otherwise WebRoot
            var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot", relativePath.TrimStart('/').TrimStart('\\'));
            if (File.Exists(appDataPath)) return appDataPath;

            return Path.Combine(_webHostEnvironment.WebRootPath, relativePath.TrimStart('/').TrimStart('\\'));
        }

        private string GetWritableDirectory(string folderPath)
        {
            // Try WebRoot first
            var webRootPath = Path.Combine(_webHostEnvironment.WebRootPath, folderPath);
            try
            {
                if (!Directory.Exists(webRootPath)) Directory.CreateDirectory(webRootPath);
                
                // Test write permission by creating a dummy file
                var testFile = Path.Combine(webRootPath, Guid.NewGuid().ToString() + ".tmp");
                File.WriteAllText(testFile, "test");
                File.Delete(testFile);
                
                return webRootPath;
            }
            catch (UnauthorizedAccessException)
            {
                // Fallback to ProgramData
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot", folderPath);
                if (!Directory.Exists(appDataPath)) Directory.CreateDirectory(appDataPath);
                return appDataPath;
            }
            catch (Exception)
            {
                 // Check if it's writable anyway (e.g. Directory Create failed but exists and writable?)
                 // If create directory failed with AccessDenied, catch block above catches it.
                 // If generic error, try fallback.
                 var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot", folderPath);
                 if (!Directory.Exists(appDataPath)) Directory.CreateDirectory(appDataPath);
                 return appDataPath;
            }
        }
    }
}
