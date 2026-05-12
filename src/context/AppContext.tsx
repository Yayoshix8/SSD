import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  Supplier, Activity, ActivityApproval, ActivityConsultation,
  ScoutingEvent, Notification, PipelineStage, UserRole, STAGE_ACTIVITIES,
  SupplierFile, NewSupplierInput,
} from '../types';

interface AppContextValue {
  currentRole: UserRole;
  setCurrentRole: (r: UserRole) => void;
  suppliers: Supplier[];
  events: ScoutingEvent[];
  notifications: Notification[];
  loading: boolean;
  selectedSupplierId: string | null;
  setSelectedSupplierId: (id: string | null) => void;
  selectedSupplier: Supplier | null;
  refresh: () => Promise<void>;
  completeActivity: (activityId: string, supplierId: string, actorName: string) => Promise<void>;
  submitApproval: (activityId: string, supplierId: string, approved: boolean, note: string, actorName: string) => Promise<void>;
  submitConsultation: (activityId: string, supplierId: string, input: string, actorName: string) => Promise<void>;
  advanceStage: (supplierId: string, toStage: PipelineStage, actorName: string) => Promise<void>;
  blacklistSupplier: (supplierId: string, reason: string, actorName: string) => Promise<void>;
  validateDuns: (supplierId: string) => Promise<void>;
  addNote: (supplierId: string, stage: PipelineStage, content: string, actorName: string) => Promise<void>;
  markNotificationsRead: (role: UserRole) => Promise<void>;
  updateEvent: (id: string, updates: Partial<ScoutingEvent>) => Promise<void>;
  createEvent: (e: Omit<ScoutingEvent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateSupplierCommodity: (supplierId: string, commodity: string, subcategory: string) => Promise<void>;
  createSupplier: (input: NewSupplierInput, actorName: string) => Promise<string | null>;
  acceptSupplier: (supplierId: string, assignedTo: string, actorName: string) => Promise<void>;
  uploadSupplierFile: (supplierId: string, stage: string, file: File, activityId: string | null, actorName: string) => Promise<SupplierFile | null>;
  getSupplierFiles: (supplierId: string) => Promise<SupplierFile[]>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>('ssd');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [events, setEvents] = useState<ScoutingEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) ?? null;

  const fetchAll = async () => {
    const [
      { data: sup },
      { data: acts },
      { data: approvals },
      { data: consults },
      { data: timeline },
      { data: notes },
      { data: files },
      { data: evts },
      { data: notifs },
    ] = await Promise.all([
      supabase.from('suppliers').select('*').order('created_at'),
      supabase.from('supplier_activities').select('*').order('sort_order'),
      supabase.from('activity_approvals').select('*'),
      supabase.from('activity_consultations').select('*').order('submitted_at'),
      supabase.from('supplier_timeline').select('*').order('created_at'),
      supabase.from('supplier_notes').select('*').order('created_at'),
      supabase.from('supplier_files').select('*').order('created_at', { ascending: false }),
      supabase.from('scouting_events').select('*').order('event_date'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    ]);

    const enriched = (sup ?? []).map(s => ({
      ...s,
      activities:    (acts      ?? []).filter(a => a.supplier_id === s.id) as Activity[],
      approvals:     (approvals ?? []).filter(a => a.supplier_id === s.id) as ActivityApproval[],
      consultations: (consults  ?? []).filter(c => c.supplier_id === s.id) as ActivityConsultation[],
      timeline:      (timeline  ?? []).filter(t => t.supplier_id === s.id),
      notes:         (notes     ?? []).filter(n => n.supplier_id === s.id),
      files:         (files     ?? []).filter(f => f.supplier_id === s.id) as SupplierFile[],
    })) as Supplier[];

    setSuppliers(enriched);
    setEvents(evts ?? []);
    setNotifications(notifs ?? []);
  };

  const refresh = async () => { await fetchAll(); };

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));

    // Real-time: re-fetch whenever any relevant table changes (any tab, any user)
    const channel = supabase
      .channel('ssd-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_activities' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_files' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_notes' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_timeline' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const seedActivities = async (supplierId: string, stage: PipelineStage) => {
    const defs = STAGE_ACTIVITIES[stage];
    if (!defs.length) return;
    const rows = defs.map((d, i) => ({
      supplier_id: supplierId,
      stage,
      activity_key: d.key,
      activity_label: d.label,
      responsible_roles: d.responsible_roles,
      accountable_roles: d.accountable_roles,
      support_roles: d.support_roles,
      consulted_roles: d.consulted_roles,
      informed_roles: d.informed_roles,
      requires_dual_approval: d.requires_dual_approval,
      requires_consultation: d.requires_consultation,
      is_gate: d.is_gate,
      sort_order: i,
    }));
    await supabase.from('supplier_activities').upsert(rows, { onConflict: 'supplier_id,activity_key' });
  };

  const notifyRoles = async (roles: UserRole[], supplierId: string, title: string, body: string) => {
    const rows = roles.map(r => ({ target_role: r, supplier_id: supplierId, title, body }));
    if (rows.length) await supabase.from('notifications').insert(rows);
  };

  const completeActivity = async (activityId: string, supplierId: string, actorName: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const activity = supplier?.activities?.find(a => a.id === activityId);
    if (!activity) return;

    await supabase.from('supplier_activities').update({
      is_complete: true,
      completed_at: new Date().toISOString(),
      completed_by: actorName,
      completed_by_role: currentRole,
    }).eq('id', activityId);

    await supabase.from('supplier_timeline').insert({
      supplier_id: supplierId,
      event_type: 'activity_complete',
      description: `Activity completed: "${activity.activity_label}"`,
      performed_by_role: currentRole,
      performed_by_name: actorName,
    });

    const informedRoles = activity.informed_roles ?? [];
    if (informedRoles.length) {
      await notifyRoles(informedRoles, supplierId,
        `Activity completed: ${activity.activity_label}`,
        `Completed by ${actorName} (${currentRole.toUpperCase()}) for ${supplier?.name}`
      );
    }
    await fetchAll();
  };

  const submitApproval = async (activityId: string, supplierId: string, approved: boolean, note: string, actorName: string) => {
    await supabase.from('activity_approvals').upsert({
      activity_id: activityId,
      supplier_id: supplierId,
      role: currentRole,
      approved,
      rejection_note: note,
      approved_by_name: actorName,
      created_at: new Date().toISOString(),
    }, { onConflict: 'activity_id,role' });

    const { data: allApprovals } = await supabase
      .from('activity_approvals')
      .select('*')
      .eq('activity_id', activityId);

    const pmApproved = allApprovals?.find(a => a.role === 'pm')?.approved;
    const buyerApproved = allApprovals?.find(a => a.role === 'buyer')?.approved;

    if (pmApproved === true && buyerApproved === true) {
      await supabase.from('supplier_activities').update({
        is_complete: true,
        completed_at: new Date().toISOString(),
        completed_by: 'PM + Buyer',
        completed_by_role: currentRole,
      }).eq('id', activityId);

      const supplier = suppliers.find(s => s.id === supplierId);
      await supabase.from('supplier_timeline').insert({
        supplier_id: supplierId,
        event_type: 'dual_approval_complete',
        description: `Dual approval completed by PM + Buyer`,
        performed_by_role: currentRole,
        performed_by_name: actorName,
      });
      await notifyRoles(['ssd'], supplierId, 'Dual approval complete', `Both PM and Buyer approved for ${supplier?.name}`);
    }

    if (pmApproved === false || buyerApproved === false) {
      await supabase.from('supplier_timeline').insert({
        supplier_id: supplierId,
        event_type: 'approval_rejected',
        description: `Approval rejected by ${currentRole.toUpperCase()}: ${note}`,
        performed_by_role: currentRole,
        performed_by_name: actorName,
      });
    }

    await fetchAll();
  };

  const submitConsultation = async (activityId: string, supplierId: string, input: string, actorName: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const activity = supplier?.activities?.find(a => a.id === activityId);

    await supabase.from('activity_consultations').insert({
      activity_id: activityId,
      supplier_id: supplierId,
      role: currentRole,
      consultant_name: actorName,
      input_text: input,
    });

    if (activity) {
      const responsibleRoles = activity.responsible_roles ?? [];
      await notifyRoles(responsibleRoles, supplierId,
        `Consultation input submitted`,
        `${actorName} (${currentRole.toUpperCase()}) submitted input for: "${activity.activity_label}"`
      );
    }
    await fetchAll();
  };

  const advanceStage = async (supplierId: string, toStage: PipelineStage, actorName: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    await supabase.from('suppliers').update({
      current_stage: toStage,
      stage_entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', supplierId);

    await supabase.from('supplier_timeline').insert({
      supplier_id: supplierId,
      event_type: 'stage_change',
      from_stage: supplier.current_stage,
      to_stage: toStage,
      description: `Advanced to ${toStage.replace(/_/g, ' ')}`,
      performed_by_role: currentRole,
      performed_by_name: actorName,
    });

    await seedActivities(supplierId, toStage);

    const allRoles: UserRole[] = ['ssd', 'pm', 'buyer', 'sqd'];
    await notifyRoles(allRoles, supplierId,
      `${supplier.name} advanced to new stage`,
      `Now in: ${toStage.replace(/_/g, ' ')} — actioned by ${actorName}`
    );

    await fetchAll();
  };

  const blacklistSupplier = async (supplierId: string, reason: string, actorName: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    await supabase.from('suppliers').update({
      current_stage: 'blacklisted',
      blacklist_reason: reason,
      blacklisted_by: actorName,
      blacklisted_at: new Date().toISOString(),
      stage_entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', supplierId);

    await supabase.from('supplier_timeline').insert({
      supplier_id: supplierId,
      event_type: 'blacklisted',
      from_stage: supplier.current_stage,
      to_stage: 'blacklisted',
      description: `Blacklisted. Reason: ${reason}`,
      performed_by_role: currentRole,
      performed_by_name: actorName,
    });

    await fetchAll();
  };

  const validateDuns = async (supplierId: string) => {
    await supabase.from('suppliers').update({ duns_validated: true, updated_at: new Date().toISOString() }).eq('id', supplierId);
    await fetchAll();
  };

  const addNote = async (supplierId: string, stage: PipelineStage, content: string, actorName: string) => {
    await supabase.from('supplier_notes').insert({
      supplier_id: supplierId, stage, content, author_role: currentRole, author_name: actorName,
    });
    await fetchAll();
  };

  const markNotificationsRead = async (role: UserRole) => {
    await supabase.from('notifications').update({ is_read: true }).eq('target_role', role).eq('is_read', false);
    await fetchAll();
  };

  const updateEvent = async (id: string, updates: Partial<ScoutingEvent>) => {
    await supabase.from('scouting_events').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    await fetchAll();
  };

  const createEvent = async (e: Omit<ScoutingEvent, 'id' | 'created_at' | 'updated_at'>) => {
    await supabase.from('scouting_events').insert(e);
    await fetchAll();
  };

  const updateSupplierCommodity = async (supplierId: string, commodity: string, subcategory: string) => {
    await supabase.from('suppliers').update({
      commodity, commodity_subcategory: subcategory, updated_at: new Date().toISOString(),
    }).eq('id', supplierId);
    await fetchAll();
  };

  const createSupplier = async (input: NewSupplierInput, actorName: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: input.name,
        legal_entity: input.legal_entity || input.name,
        country: input.country,
        facility_location: input.facility_location,
        commodity: input.commodity,
        commodity_subcategory: input.commodity_subcategory,
        component_category: input.component_category,
        programs: input.programs,
        duns_number: input.duns_number,
        duns_validated: false,
        assigned_ssd_member: input.assigned_ssd_member,
        contact_name: input.contact_name,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone,
        elm_score: input.elm_score,
        current_stage: 'new_supplier_identified',
        stage_entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (error || !data?.id) return null;

    const supplierId = data.id;

    await supabase.from('supplier_timeline').insert({
      supplier_id: supplierId,
      event_type: 'registered',
      to_stage: 'new_supplier_identified',
      description: `Supplier registered by ${actorName}`,
      performed_by_role: currentRole,
      performed_by_name: actorName,
    });

    await seedActivities(supplierId, 'new_supplier_identified');
    await fetchAll();
    return supplierId;
  };

  const acceptSupplier = async (supplierId: string, assignedTo: string, actorName: string) => {
    await supabase.from('suppliers').update({
      current_stage: 'new_supplier_identified',
      pending_review: false,
      assigned_ssd_member: assignedTo,
      stage_entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', supplierId);

    await supabase.from('supplier_timeline').insert({
      supplier_id: supplierId,
      event_type: 'accepted',
      from_stage: 'form_submitted',
      to_stage: 'new_supplier_identified',
      description: `Accepted into pipeline by ${actorName}${assignedTo ? ` · Assigned to ${assignedTo}` : ''}`,
      performed_by_role: currentRole,
      performed_by_name: actorName,
    });

    await seedActivities(supplierId, 'new_supplier_identified');
    await fetchAll();
  };

  const uploadSupplierFile = async (
    supplierId: string,
    stage: string,
    file: File,
    activityId: string | null,
    actorName: string,
  ): Promise<SupplierFile | null> => {
    const ext = file.name.split('.').pop();
    const path = `${supplierId}/${stage}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from('supplier-files')
      .upload(path, file, { upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      return null;
    }

    const { data: row, error: dbError } = await supabase
      .from('supplier_files')
      .insert({
        supplier_id: supplierId,
        stage,
        activity_id: activityId,
        file_name: file.name,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type || `application/octet-stream`,
        uploaded_by: actorName,
        uploaded_by_role: currentRole,
      })
      .select()
      .maybeSingle();

    if (dbError || !row) return null;

    await supabase.from('supplier_timeline').insert({
      supplier_id: supplierId,
      event_type: 'file_uploaded',
      description: `File uploaded: "${file.name}" in stage ${stage.replace(/_/g, ' ')}`,
      performed_by_role: currentRole,
      performed_by_name: actorName,
    });

    await fetchAll();
    return row as SupplierFile;
  };

  const getSupplierFiles = async (supplierId: string): Promise<SupplierFile[]> => {
    const { data } = await supabase
      .from('supplier_files')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (!data) return [];

    // Resolve signed URLs (valid 1 hour)
    const withUrls = await Promise.all(
      data.map(async (f) => {
        const { data: urlData } = await supabase.storage
          .from('supplier-files')
          .createSignedUrl(f.storage_path, 3600);
        return { ...f, url: urlData?.signedUrl ?? '' } as SupplierFile;
      })
    );
    return withUrls;
  };

  return (
    <AppContext.Provider value={{
      currentRole, setCurrentRole, suppliers, events, notifications, loading,
      selectedSupplierId, setSelectedSupplierId, selectedSupplier,
      refresh, completeActivity, submitApproval, submitConsultation,
      advanceStage, blacklistSupplier, validateDuns, addNote,
      markNotificationsRead, updateEvent, createEvent, updateSupplierCommodity,
      createSupplier, acceptSupplier, uploadSupplierFile, getSupplierFiles,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
