using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using POS.Common.Services;

namespace POS.Helper.Services
{
    public class CsvParserService : ICsvParserService
    {
        public async Task<List<T>> ReadCsvAsync<T>(string filePath) where T : class, new()
        {
            if (!File.Exists(filePath)) return new List<T>();

            var lines = await File.ReadAllLinesAsync(filePath);
            if (lines.Length < 2) return new List<T>();

            var headerLine = lines[0];
            var headers = ParseCsvLine(headerLine);
            
            var properties = typeof(T).GetProperties()
                .ToDictionary(p => p.Name, p => p, StringComparer.OrdinalIgnoreCase);

            var entities = new List<T>();

            for (int i = 1; i < lines.Length; i++)
            {
                var line = lines[i];
                if (string.IsNullOrWhiteSpace(line)) continue;

                var values = ParseCsvLine(line);
                var entity = new T();
                bool hasData = false;

                for (int j = 0; j < headers.Count && j < values.Count; j++)
                {
                    var header = headers[j];
                    var value = values[j];

                    if (properties.TryGetValue(header, out var prop) && prop.CanWrite)
                    {
                        try
                        {
                            if (string.IsNullOrEmpty(value) || value == "NULL")
                            {
                                prop.SetValue(entity, null);
                            }
                            else
                            {
                                var targetType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
                                
                                if (targetType == typeof(Guid))
                                {
                                    if (Guid.TryParse(value, out var g))
                                    {
                                        prop.SetValue(entity, g);
                                    }
                                    // Quietly ignore typical malformed boolean/null strings in Guid fields
                                }
                                else if (targetType == typeof(bool))
                                {
                                    prop.SetValue(entity, value == "1" || value.Equals("true", StringComparison.OrdinalIgnoreCase));
                                }
                                else if (targetType == typeof(DateTime))
                                {
                                    if (DateTime.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d))
                                        prop.SetValue(entity, d);
                                    else if (DateTime.TryParse(value, out var d2))
                                        prop.SetValue(entity, d2);
                                }
                                else if (targetType.IsEnum)
                                {
                                    prop.SetValue(entity, Enum.Parse(targetType, value));
                                }
                                else
                                {
                                    prop.SetValue(entity, Convert.ChangeType(value, targetType));
                                }
                            }
                            hasData = true;
                        }
                        catch
                        {
                            // Suppress logs for common seeding data mismatches to avoid performance hit
                        }
                    }
                }

                if (hasData)
                {
                    entities.Add(entity);
                }
            }

            return entities;
        }

        public List<string> ParseCsvLine(string line)
        {
            var result = new List<string>();
            var current = new StringBuilder();
            bool inQuotes = false;

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];

                if (inQuotes)
                {
                    if (c == '"')
                    {
                        // Check for escaped quote ""
                        if (i + 1 < line.Length && line[i + 1] == '"')
                        {
                            current.Append('"');
                            i++;
                        }
                        else
                        {
                            inQuotes = false;
                        }
                    }
                    else
                    {
                        current.Append(c);
                    }
                }
                else
                {
                    if (c == '"')
                    {
                        inQuotes = true;
                    }
                    else if (c == ',')
                    {
                        result.Add(current.ToString());
                        current.Clear();
                    }
                    else
                    {
                        current.Append(c);
                    }
                }
            }
            result.Add(current.ToString());
            return result;
        }
    }
}
