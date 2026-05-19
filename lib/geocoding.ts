export async function getCoordinatesFromAddress(address: string, city: string) {
    try {
        // Gabungkan alamat dan kota agar pencarian lebih akurat
        const fullAddress = `${address}, ${city}, Indonesia`;
        
        // Memanggil API gratis dari OpenStreetMap (Nominatim)
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
        
        const data = await response.json();

        // Jika alamat ditemukan, kembalikan titik koordinatnya
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }
        
        return null; // Alamat tidak ditemukan di peta
    } catch (error) {
        console.error("Gagal menerjemahkan alamat:", error);
        return null;
    }
}