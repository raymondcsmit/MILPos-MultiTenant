using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.Common.Services
{
    public interface ICsvParserService
    {
        Task<List<T>> ReadCsvAsync<T>(string filePath) where T : class, new();
        List<string> ParseCsvLine(string line);
    }
}
