import React, { useState } from 'react'
import NavbarDashboard from '../../Components/Admin/NavbarDashboard/NavbarDashboard'
import FloatingMenuDashboard from '../../Components/Admin/FloatingMenuDashboard/FloatingMenuDashboard'
import './Header.css'
export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div>
            <NavbarDashboard isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
            {menuOpen && (
                <button
                    type="button"
                    className="dashboardMenuBackdrop"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Cerrar menu"
                />
            )}
            <FloatingMenuDashboard
                menuOpen={menuOpen}
                onToggleMenu={() => setMenuOpen((prev) => !prev)}
            />

        </div>
    )
}
