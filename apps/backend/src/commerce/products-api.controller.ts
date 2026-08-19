import { Controller, Get, Param, Query } from "@nestjs/common";
import { CommerceService } from "./commerce.service";

@Controller("api")
export class ProductsApiController {
  constructor(private commerceService: CommerceService) {}

  @Get("products")
  async getProducts(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("subcategory") subcategory?: string,
    @Query("search") search?: string,
    @Query("sort") sort?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 48;
    const minPriceNum = minPrice ? parseFloat(minPrice) : undefined;
    const maxPriceNum = maxPrice ? parseFloat(maxPrice) : undefined;

    const data = await this.commerceService.getProductsApi({
      page: pageNum,
      limit: limitNum,
      category,
      subcategory,
      search,
      sort,
      minPrice: minPriceNum,
      maxPrice: maxPriceNum,
    });
    return { success: true, data };
  }

  @Get("products/search")
  async searchProducts(
    @Query("search") search: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.getProducts(page, limit, undefined, undefined, search);
  }

  @Get("products/:productId")
  async getProduct(@Param("productId") productId: string) {
    const data = await this.commerceService.getProductDetails(productId);
    return { success: true, data };
  }

  @Get("categories")
  async getCategories() {
    const data = await this.commerceService.getParentCategories();
    return data;
  }

  @Get("categories/:category/subcategories")
  async getSubcategories(@Param("category") category: string) {
    const data = await this.commerceService.getSubcategoriesForCategoryName(category);
    return data;
  }
}
