<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Organization extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['name','acronym','legal_status','registration_number','country','city','address','logo_path','default_currency','fiscal_year_start_month','is_active','approval_status','approved_by','approved_at','rejection_reason'];
    protected $casts = ['is_active' => 'boolean', 'fiscal_year_start_month' => 'integer', 'approved_at' => 'datetime'];

    public function users(): BelongsToMany { return $this->belongsToMany(User::class, 'user_organizations')->withPivot(['role_id','is_primary','status'])->withTimestamps(); }
    public function donors(): HasMany { return $this->hasMany(Donor::class); }
    public function projects(): HasMany { return $this->hasMany(Project::class); }
    public function expenses(): HasMany { return $this->hasMany(Expense::class); }
    public function revenues(): HasMany { return $this->hasMany(Revenue::class); }
    public function bankAccounts(): HasMany { return $this->hasMany(BankAccount::class); }
    public function approver(): BelongsTo { return $this->belongsTo(SuperAdmin::class, 'approved_by'); }
    public function subscription(): HasOne { return $this->hasOne(Subscription::class); }
    public function invoices(): HasMany { return $this->hasMany(Invoice::class); }

    /**
     * Point de vérité UNIQUE pour savoir si l'organisation peut utiliser
     * l'application, appelé par EnsureOrganizationAccess (blocage des routes
     * de données) ET par AuthController::login (message clair dès la connexion).
     * Retourne null si l'accès est autorisé, ou un message explicatif sinon.
     */
    public function accessBlockedReason(): ?string
    {
        if ($this->approval_status === 'pending') {
            return "Votre organisation est en attente de validation par l’administrateur de la plateforme. Si votre organisation n’a pas été validée après 1 heure, veuillez contacter le service au +229 01 44 95 83 83.";
        }
        if ($this->approval_status === 'rejected') {
            return "L'inscription de votre organisation n'a pas été validée." . ($this->rejection_reason ? " Motif : {$this->rejection_reason}" : '');
        }

        $overdueInvoice = $this->invoices()->where('status', 'pending')->where('due_date', '<', now()->toDateString())->exists();
        if ($overdueInvoice) {
            return "Le forfait mensuel de votre organisation est impayé. Réglez la facture en attente pour retrouver l'accès.";
        }

        return null;
    }
}
