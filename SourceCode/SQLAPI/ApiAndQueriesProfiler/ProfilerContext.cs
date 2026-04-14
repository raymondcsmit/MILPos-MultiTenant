using System.Threading;

namespace ApiAndQueriesProfiler
{
    public static class ProfilerContext
    {
        private static readonly AsyncLocal<string> _correlationId = new AsyncLocal<string>();

        public static string CurrentCorrelationId
        {
            get => _correlationId.Value;
            set => _correlationId.Value = value;
        }
    }
}
