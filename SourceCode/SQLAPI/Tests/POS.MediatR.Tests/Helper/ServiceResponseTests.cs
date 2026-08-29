using System.Collections.Generic;
using POS.Helper;
using Xunit;

namespace POS.MediatR.Tests.Helper;

/// <summary>
/// ServiceResponse semantics — the envelope every handler and Postman contract check relies on.
/// Wave-0 unit reference tests.
/// </summary>
public class ServiceResponseTests
{
    [Fact]
    public void Success_IsTrue_When_DataReturned()
    {
        var response = ServiceResponse<string>.ReturnResultWith200("data");

        Assert.True(response.Success);
        Assert.Equal(200, response.StatusCode);
        Assert.Equal("data", response.Data);
        Assert.Empty(response.Errors);
    }

    [Fact]
    public void Success_IsFalse_When_FailedWithMessage()
    {
        var response = ServiceResponse<string>.ReturnFailed(409, "duplicate");

        Assert.False(response.Success);
        Assert.Equal(409, response.StatusCode);
        Assert.Null(response.Data);
        _ = Assert.Single(response.Errors);
        Assert.Equal("duplicate", response.Errors[0]);
    }

    [Fact]
    public void StatusCode_CarriesTheFailureCode_ToTheHttpResponse()
    {
        var unauthorized = ServiceResponse<string>.ReturnFailed(401, "bad credentials");
        var notFound = ServiceResponse<string>.ReturnFailed(404, "missing");

        Assert.Equal(401, unauthorized.StatusCode);
        Assert.Equal(404, notFound.StatusCode);
    }
}
