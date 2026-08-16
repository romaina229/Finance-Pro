<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    /**
     * Liste des rôles disponibles sur la plateforme (référentiel global,
     * pas propre à une organisation), pour peupler les menus d'invitation.
     */
    public function index(Request $request)
    {
        $roles = Role::orderByDesc('hierarchy_level')->get(['id', 'code', 'name', 'hierarchy_level']);

        return response()->json(['data' => $roles]);
    }
}
