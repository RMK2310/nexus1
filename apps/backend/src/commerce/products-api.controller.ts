import { Controller, Get, Param, Query } from "@nestjs/common";
import { CommerceService } from "./commerce.service";

@Controller()
export class ProductsApiController {
  constructor(private commerceService: CommerceService) {}

  // ==========================================
  // CANONICAL V1 PRODUCTS & CATEGORIES API
  // ==========================================

  @Get("api/v1/products")
  async getProductsV1(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("subcategory") subcategory?: string,
    @Query("brand") brand?: string,
    @Query("search") search?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("minRating") minRating?: string,
    @Query("availability") availability?: string,
    @Query("sort") sort?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 48;
    const minPriceNum = minPrice ? parseFloat(minPrice) : undefined;
    const maxPriceNum = maxPrice ? parseFloat(maxPrice) : undefined;
    const minRatingNum = minRating ? parseFloat(minRating) : undefined;

    const data = await this.commerceService.getProductsApi({
      page: pageNum,
      limit: limitNum,
      category,
      subcategory,
      brand,
      search,
      sort,
      minPrice: minPriceNum,
      maxPrice: maxPriceNum,
      minRating: minRatingNum,
      availability,
    });

    return {
      success: true,
      data: {
        products: data.products,
        total: data.total,
      },
    };
  }

  @Get("api/v1/products/:productId")
  async getProductDetailsV1(@Param("productId") productId: string) {
    const data = await this.commerceService.getProductDetails(productId);
    return { success: true, data };
  }

  @Get("api/v1/categories")
  async getCategoriesV1() {
    const data = await this.commerceService.getParentCategories();
    return { success: true, data };
  }

  @Get("api/v1/categories/:category/subcategories")
  async getSubcategoriesV1(@Param("category") category: string) {
    const data = await this.commerceService.getSubcategoriesForCategoryName(category);
    return { success: true, data };
  }

  // ==========================================
  // BACKWARD-COMPATIBILITY ALIASES (Mobile / Web)
  // ==========================================

  @Get("api/products")
  async getProductsLegacy(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("subcategory") subcategory?: string,
    @Query("brand") brand?: string,
    @Query("search") search?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("minRating") minRating?: string,
    @Query("availability") availability?: string,
    @Query("sort") sort?: string
  ) {
    return this.getProductsV1(
      page,
      limit,
      category,
      subcategory,
      brand,
      search,
      minPrice,
      maxPrice,
      minRating,
      availability,
      sort
    );
  }

  @Get("api/products/:productId")
  async getProductLegacy(@Param("productId") productId: string) {
    return this.getProductDetailsV1(productId);
  }

  @Get("api/categories")
  async getCategoriesLegacy() {
    const data = await this.commerceService.getParentCategories();
    return data;
  }

  @Get("api/categories/:category/subcategories")
  async getSubcategoriesLegacy(@Param("category") category: string) {
    const data = await this.commerceService.getSubcategoriesForCategoryName(category);
    return data;
  }
}
