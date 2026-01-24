using System;

namespace POS.Domain
{
    /// <summary>
    /// Provides device identification for sync operations
    /// </summary>
    public interface IDeviceIdentifier
    {
        string GetDeviceId();
    }

    /// <summary>
    /// Desktop implementation of device identifier
    /// Uses machine name + MAC address hash
    /// </summary>
    public class DeviceIdentifier : IDeviceIdentifier
    {
        private string _deviceId;

        public string GetDeviceId()
        {
            if (string.IsNullOrEmpty(_deviceId))
            {
                // Use machine name as device ID for simplicity
                // In production, combine with MAC address or use a stored GUID
                _deviceId = Environment.MachineName;
            }
            return _deviceId;
        }
    }
}
