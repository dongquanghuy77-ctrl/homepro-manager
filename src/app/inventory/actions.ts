'use server';

import { revalidatePath } from 'next/cache';
import { MaterialService } from '@/lib/inventory/material-service';
import { InventoryService } from '@/lib/inventory/services';
import { WarehouseService } from '@/lib/inventory/warehouse-service';
import { db } from '@/db';
import { materials, warehouses } from '@/db/schema';
import { eq } from 'drizzle-orm';

// --- MATERIALS ---
export async function createMaterialAction(data: any) {
  try {
    const res = await MaterialService.createMaterial(data);
    revalidatePath('/inventory/materials');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMaterialAction(id: number, data: any) {
  try {
    const res = await MaterialService.updateMaterial(id, data);
    revalidatePath('/inventory/materials');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMaterialAction(id: number) {
  try {
    await MaterialService.deleteMaterial(id);
    revalidatePath('/inventory/materials');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- WAREHOUSES & LOCATIONS ---
export async function createWarehouseAction(data: any) {
  try {
    const res = await WarehouseService.createWarehouse(data);
    revalidatePath('/inventory/warehouses');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}



// --- MOVEMENTS ---
export async function receiveGoodsAction(data: any) {
  try {
    const res = await InventoryService.receiveGoods(data);
    revalidatePath('/inventory/transactions');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function issueMaterialAction(data: any) {
  try {
    const res = await InventoryService.issueMaterial(data);
    revalidatePath('/inventory/transactions');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function transferStockAction(data: any) {
  try {
    const res = await InventoryService.transferStock(data);
    revalidatePath('/inventory/transactions');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- SUPPLIERS ---
import { SupplierService, InventoryCountService } from '@/lib/inventory/services';

export async function createSupplierAction(data: any) {
  try {
    const res = await SupplierService.createSupplier(data);
    revalidatePath('/inventory/suppliers');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSupplierAction(id: number, data: any) {
  try {
    const res = await SupplierService.updateSupplier(id, data);
    revalidatePath('/inventory/suppliers');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- RESERVATIONS ---
export async function createReservationAction(data: any) {
  try {
    const res = await InventoryService.createReservation(data);
    revalidatePath('/inventory/reservations');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelReservationAction(reservationId: number) {
  try {
    const res = await InventoryService.cancelReservation(reservationId);
    revalidatePath('/inventory/reservations');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- COUNTS (KIỂM KÊ) ---
export async function createStocktakeAction(data: any) {
  try {
    const res = await InventoryCountService.createStocktake(data);
    revalidatePath('/inventory/counts');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function completeStocktakeAction(countId: number, userId: number) {
  try {
    const res = await InventoryCountService.completeStocktake(countId, userId);
    revalidatePath('/inventory/counts');
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCountItemAction(itemId: number, countedQty: number, notes?: string) {
  try {
    await InventoryCountService.updateCountItem(itemId, countedQty, notes);
    revalidatePath('/inventory/counts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
