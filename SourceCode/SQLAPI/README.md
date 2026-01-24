Chem Website:
===========

The product is being developed and supported by the professional team since 2020.

This project runs on ASP.NET 5.0 with an MS SQL 2012 (or higher) backend database.

This project is cross-platform, and you can run it on Windows, Linux, or Mac.

All methods in Chem Website project are async.

Chem Website project supports token base authentication.

Chem Website project architecture follows well-known software patterns and the best security practices. The source code is fully customizable. Pluggable and clear architecture makes it easy to develop custom functionality and follow any business requirements.

Using the latest Microsoft technologies, Chem Website project provides high performance, stability, and security.

##  Installation Guide ##
### Prerequisites ###
.NET 5.0 SDK and VISUAL STUDIO 2019, SQL SERVER

### Installation steps ###
1. Open  solution file `ChemWebsite.sln` from .Net core folder into visual studio 2019.
2. Right click on solution explorer and ` Restore nuget packages.`
3. Change database connection string in `appsettings.Development.json` in `ChemWebsite.API ` project. 
4. Open package manager console from  ` visual studio menu --> Tools --> nuget Package Manager --> Package Manager Console `                       
5. In package manager console, Select default project as `ChemWebsite.Domain`
6. Run `Update-Database` command in package manager console which create database and insert intial data.
7. From Solution Explorer, Right click on ` ChemWebsite.API ` project and click on ` Set as Startup Project ` from menu.
8. To run project ` Press F5`.

##  Project Structure ##
   <pre class="prettyprint">
├──ChemWebsite.sln/                     * projects solution
│   │
│   ├──ChemWebsite.API                  * REST API Controller, Dependancy configuration, Auto mapper profile 
│   │
│   ├──ChemWebsite.MediatR              * Command handler, Query handler, Fluent API validation
│   │
│   ├──ChemWebsite.Repository           * Each entity repository
│   │
│   ├──ChemWebsite.Domain               * Entity framework dbContext 
|   |
│   ├──ChemWebsite.Common               * Generic repository and Unit of work patterns
│   │ 
│   ├──ChemWebsite.Data                 * Entity classes and DTO classes
│   │
│   ├──ChemWebsite.Helper               * Utility classes

</pre>
##  Swagger API ##
![alt text](swagger.PNG)
                        

 