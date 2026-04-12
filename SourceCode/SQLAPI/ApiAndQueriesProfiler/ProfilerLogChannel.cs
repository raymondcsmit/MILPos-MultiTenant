using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;

namespace ApiAndQueriesProfiler
{
    public class ProfilerLogChannel
    {
        private readonly Channel<object> _channel;

        public ProfilerLogChannel()
        {
            _channel = Channel.CreateBounded<object>(new BoundedChannelOptions(10000)
            {
                FullMode = BoundedChannelFullMode.DropOldest
            });
        }

        public bool TryWrite(object log)
        {
            return _channel.Writer.TryWrite(log);
        }

        public IAsyncEnumerable<object> ReadAllAsync(CancellationToken cancellationToken)
        {
            return _channel.Reader.ReadAllAsync(cancellationToken);
        }

        public bool TryRead(out object item)
        {
            return _channel.Reader.TryRead(out item);
        }
    }
}