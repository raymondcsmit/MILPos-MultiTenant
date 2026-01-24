export abstract class ResourceParameter {
  fields = '';
  orderBy = '';
  searchQuery = '';
  pageSize: number = 30;
  skip: number = 0;
  name = '';
  totalCount: number = 0;
}
