using System.Threading.Tasks;

namespace POS.Common.Services
{
    public interface IFileStorageService
    {
        Task<string> SaveFileAsync(string folderPath, byte[] fileContent, string fileName);
        Task<string> SaveFileAsync(string folderPath, string base64Data, string fileName);
        Task<string> SaveThumbnailAsync(string folderPath, string base64Data, string fileName);
        void DeleteFile(string relativeFilePath);
        string GetPhysicalPath(string relativePath);
    }
}
