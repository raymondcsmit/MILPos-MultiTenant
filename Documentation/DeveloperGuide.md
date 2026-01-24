# Developer Guide: POS with Inventory Management

This document provides a detailed technical guide for junior developers on how to work with the POS with Inventory Management codebase. The project follows a **Clean Architecture** with **CQRS** (Command Query Responsibility Segregation) on the backend and **Angular** on the frontend.

---

## 1. Architecture Overview

### Backend (ASP.NET Core)
The backend is structured into several layers:
-   **POS.Data**: Contains Domain Entities (Database tables) and DTOs (Data Transfer Objects).
-   **POS.Repository**: Handles database access using Entity Framework Core.
-   **POS.MediatR**: Contains the Application Logic (Commands, Queries, Handlers, Validators).
-   **POS.API**: The entry point (Controllers) that exposes REST endpoints.
-   **POS.Common/Helper**: Shared utilities.

### Frontend (Angular)
The frontend uses Angular with Angular Material:
-   **src/app**: Main application code.
-   **core/domain-classes**: TypeScript models matching backend DTOs.
-   **core/services**: Services for HTTP communication.
-   **[feature-name]**: Feature modules (e.g., `city`, `brand`) containing Components (List, Manage).

---

## 2. How to Make a New API (Backend)

To create a new feature (e.g., "Product"), follow these steps:

### Step 1: Create the Entity
Define your database table in `POS.Data/Entities`.
```csharp
// POS.Data/Entities/Product.cs
public class Product : BaseEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
}
```

### Step 2: Create the DTO
Create a Data Transfer Object in `POS.Data/Dto` to control what is sent to/from the API.
```csharp
// POS.Data/Dto/ProductDto.cs
public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
}
```

### Step 3: Create Commands and Queries
In `POS.MediatR`, create a folder for your feature.
-   **Commands**: For Write operations (Add, Update, Delete).
-   **Queries**: For Read operations (Get, Search).

**Example Command (AddProductCommand.cs):**
```csharp
public class AddProductCommand : IRequest<ServiceResponse<ProductDto>>
{
    public string Name { get; set; }
    public decimal Price { get; set; }
}
```

**Example Query (GetAllProductsQuery.cs):**
```csharp
public class GetAllProductsQuery : IRequest<ProductList>
{
    public ProductResource Resource { get; set; } // For pagination/filtering
}
```

### Step 4: Create Handlers
Handlers contain the business logic. They implement `IRequestHandler`.

**Example Handler (AddProductCommandHandler.cs):**
```csharp
public class AddProductCommandHandler : IRequestHandler<AddProductCommand, ServiceResponse<ProductDto>>
{
    private readonly IRepository<Product> _repository;
    private readonly IUnitOfWork<POSDbContext> _uow;
    private readonly IMapper _mapper;

    public AddProductCommandHandler(IRepository<Product> repository, IUnitOfWork<POSDbContext> uow, IMapper mapper)
    {
        _repository = repository;
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ServiceResponse<ProductDto>> Handle(AddProductCommand request, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<Product>(request);
        entity.Id = Guid.NewGuid();
        _repository.Add(entity);
        await _uow.SaveAsync();
        return ServiceResponse<ProductDto>.ReturnResultWith200(_mapper.Map<ProductDto>(entity));
    }
}
```

### Step 5: Configure Mapping
Add mapping rules in `POS.API/Helpers/Mapping`.
```csharp
// ProductProfile.cs
public class ProductProfile : Profile
{
    public ProductProfile()
    {
        CreateMap<Product, ProductDto>().ReverseMap();
        CreateMap<AddProductCommand, Product>();
    }
}
```

### Step 6: Create the Controller
Create a controller in `POS.API/Controllers` to expose the endpoints.
```csharp
[Route("api/[controller]")]
[ApiController]
public class ProductController : BaseController
{
    private readonly IMediator _mediator;

    public ProductController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> AddProduct([FromBody] AddProductCommand command)
    {
        var result = await _mediator.Send(command);
        return ReturnFormattedResponse(result);
    }
}
```

---

## 3. How to Make a New Form (Frontend)

Forms are usually implemented as "Manage" components (e.g., `ManageProductComponent`).

### Step 1: Create Component
Use Angular CLI or manually create files:
-   `manage-product.component.ts`
-   `manage-product.component.html`

### Step 2: Implement Logic (TS)
Use `FormBuilder` to create the form.
```typescript
export class ManageProductComponent extends BaseComponent implements OnInit {
  productForm: FormGroup;

  constructor(
    private fb: UntypedFormBuilder,
    private productService: ProductService,
    public dialogRef: MatDialogRef<ManageProductComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Product
  ) { super(); }

  ngOnInit() {
    this.createForm();
    if (this.data) {
        this.productForm.patchValue(this.data); // Populate for Edit
    }
  }

  createForm() {
    this.productForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]]
    });
  }

  saveProduct() {
    if (this.productForm.valid) {
      // Call Service to Save
      this.productService.addProduct(this.productForm.value).subscribe(res => {
          this.dialogRef.close(res);
      });
    }
  }
}
```

### Step 3: Implement UI (HTML)
Use Angular Material controls.
```html
<form [formGroup]="productForm">
  <mat-form-field>
    <mat-label>Name</mat-label>
    <input matInput formControlName="name">
  </mat-form-field>
  
  <mat-form-field>
    <mat-label>Price</mat-label>
    <input matInput type="number" formControlName="price">
  </mat-form-field>

  <button mat-raised-button color="primary" (click)="saveProduct()">Save</button>
</form>
```

---

## 4. How to Make a List (Frontend)

Lists display data using `MatTable`.

### Step 1: Create Component
-   `product-list.component.ts`
-   `product-list.component.html`

### Step 2: Implement Logic (TS)
Load data from service.
```typescript
export class ProductListComponent implements OnInit {
  dataSource: MatTableDataSource<Product>;
  displayedColumns: string[] = ['name', 'price', 'actions'];

  constructor(private productService: ProductService, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getProducts().subscribe(data => {
      this.dataSource = new MatTableDataSource(data);
    });
  }
  
  // Open Add/Edit Form
  manageProduct(product?: Product) {
      this.dialog.open(ManageProductComponent, { data: product })
          .afterClosed().subscribe(() => this.loadProducts());
  }
}
```

### Step 3: Implement UI (HTML)
```html
<table mat-table [dataSource]="dataSource">
  <!-- Name Column -->
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef> Name </th>
    <td mat-cell *matCellDef="let element"> {{element.name}} </td>
  </ng-container>

  <!-- Price Column -->
  <ng-container matColumnDef="price">
    <th mat-header-cell *matHeaderCellDef> Price </th>
    <td mat-cell *matCellDef="let element"> {{element.price}} </td>
  </ng-container>

  <!-- Actions -->
  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef> Action </th>
    <td mat-cell *matCellDef="let element">
        <button (click)="manageProduct(element)">Edit</button>
    </td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="displayedColumns"></tr>
</table>
```

---

## 5. How to Bind to API (Frontend)

Services act as the bridge between Frontend and Backend.

### Step 1: Create the Service
`src/app/product/product.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) { }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>('api/product');
  }

  addProduct(product: Product): Observable<Product> {
    return this.http.post<Product>('api/product', product);
  }
  
  updateProduct(id: string, product: Product): Observable<Product> {
      return this.http.put<Product>(`api/product/${id}`, product);
  }
}
```

### Step 2: Define the Model
`src/app/core/domain-classes/product.ts`
```typescript
export interface Product {
    id: string;
    name: string;
    price: number;
}
```

---

## 6. How to Make Changes

### Changing an Existing API
1.  **Modify Entity**: Add property in `POS.Data/Entities`.
2.  **Migration**: Run EF Core migration commands (e.g., `Add-Migration`, `Update-Database`) to update the DB.
3.  **Modify DTO**: Update `POS.Data/Dto` to include the new field.
4.  **Update Logic**: Update Command/Handler in `POS.MediatR` to handle the new field.
5.  **Update Frontend**: Update TypeScript model and HTML forms to include the new field.

### Changing a Frontend Form
1.  **HTML**: Add the new input field.
2.  **TS**: Add the control to the `FormGroup` in `createForm()`.
3.  **Model**: Update the TypeScript interface.

---

## Summary Checklist for New Feature
1.  [ ] **Backend**: Entity created?
2.  [ ] **Backend**: DTO created?
3.  [ ] **Backend**: Command/Handler implemented?
4.  [ ] **Backend**: Controller endpoint added?
5.  [ ] **Frontend**: Interface model created?
6.  [ ] **Frontend**: Service method added?
7.  [ ] **Frontend**: List component updated?
8.  [ ] **Frontend**: Form component updated?
