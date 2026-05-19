// Fungsi untuk mengubah derajat ke radian
function toRadian(degree: number): number {
    return degree * (Math.PI / 180);
}

// Fungsi utama menghitung jarak (mengembalikan hasil dalam satuan Kilometer)
export function calculateDistance(
    lat1: number, lon1: number, // Titik A (Posisi Kurir saat ini)
    lat2: number, lon2: number  // Titik B (Alamat Tujuan)
): number {
    const R = 6371; // Jari-jari bumi dalam kilometer
    
    const dLat = toRadian(lat2 - lat1);
    const dLon = toRadian(lon2 - lon1);
    
    const lat1Rad = toRadian(lat1);
    const lat2Rad = toRadian(lat2);

    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad); 
        
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const distance = R * c;
    
    // Membulatkan hasil ke 2 angka di belakang koma (misal: 5.42 km)
    return Math.round(distance * 100) / 100;
}