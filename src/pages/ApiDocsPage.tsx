import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Search,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Server,
  Layers,
  Terminal,
  ExternalLink,
  BookOpen,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '../components/Toast.tsx';

interface ApiDocsPageProps {
  onNavigate?: (page: string, param?: string) => void;
}

interface EndpointDoc {
  id: string;
  category: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
  authRequired: boolean;
  requiredRole?: string;
  headers?: Record<string, string>;
  queryParams?: Array<{ name: string; type: string; description: string; required?: boolean }>;
  pathParams?: Array<{ name: string; type: string; description: string }>;
  requestBody?: Record<string, any>;
  responseSuccess: {
    status: number;
    body: Record<string, any>;
  };
  responseError?: {
    status: number;
    body: Record<string, any>;
  };
}

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({
    'auth-login': true,
    'vessels-get': true
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('success', 'Copied to Clipboard', 'Code snippet copied.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedEndpoints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    endpoints.forEach((ep) => {
      next[ep.id] = expand;
    });
    setExpandedEndpoints(next);
  };

  const categories = [
    'All',
    'Authentication',
    'Dashboard & Stats',
    'Vessels',
    'Voyages',
    'Route Tracking',
    'Cargo Manifests',
    'Fuel Operations',
    'Maintenance',
    'Ports',
    'Crew',
    'Operational Alerts',
    'User Administration',
    'Reports'
  ];

  const endpoints: EndpointDoc[] = [
    // AUTHENTICATION
    {
      id: 'auth-login',
      category: 'Authentication',
      method: 'POST',
      path: '/api/auth/login',
      title: 'User & Admin Authentication',
      description: 'Authenticates credentials using bcrypt password comparison and issues signed JWT bearer token with user role metadata.',
      authRequired: false,
      headers: { 'Content-Type': 'application/json' },
      requestBody: {
        email: 'user@shipfleet.com',
        password: 'User@123'
      },
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          message: 'Login successful',
          data: {
            user: {
              _id: 'usr_user_001',
              name: 'Chief Officer Elena Rostova',
              email: 'user@shipfleet.com',
              role: 'user',
              status: 'active',
              department: 'Fleet Operations & Voyage Control'
            },
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        }
      },
      responseError: {
        status: 401,
        body: { success: false, message: 'Invalid email or password' }
      }
    },
    {
      id: 'auth-me',
      category: 'Authentication',
      method: 'GET',
      path: '/api/auth/me',
      title: 'Get Current Authenticated Profile',
      description: 'Validates JWT token header and returns the current user profile.',
      authRequired: true,
      headers: { Authorization: 'Bearer <jwt_token>' },
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          data: {
            _id: 'usr_user_001',
            name: 'Chief Officer Elena Rostova',
            email: 'user@shipfleet.com',
            role: 'user',
            department: 'Fleet Operations & Voyage Control'
          }
        }
      },
      responseError: {
        status: 401,
        body: { success: false, message: 'Unauthorized: Invalid or expired token' }
      }
    },
    {
      id: 'auth-change-password',
      category: 'Authentication',
      method: 'PUT',
      path: '/api/auth/change-password',
      title: 'Update Password',
      description: 'Updates personal login password for currently authenticated user.',
      authRequired: true,
      headers: { Authorization: 'Bearer <jwt_token>', 'Content-Type': 'application/json' },
      requestBody: {
        currentPassword: 'User@123',
        newPassword: 'User@NewPass456'
      },
      responseSuccess: {
        status: 200,
        body: { success: true, message: 'Password updated successfully' }
      }
    },

    // DASHBOARD
    {
      id: 'dashboard-stats',
      category: 'Dashboard & Stats',
      method: 'GET',
      path: '/api/dashboard/stats',
      title: 'Aggregated Fleet Operations KPIs',
      description: 'Retrieves aggregated real-time operational statistics with Redis cache acceleration.',
      authRequired: true,
      headers: { Authorization: 'Bearer <jwt_token>' },
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          data: {
            totalVessels: 10,
            activeVessels: 6,
            vesselsInMaintenance: 1,
            dockedVessels: 2,
            idleVessels: 1,
            activeVoyages: 5,
            completedVoyages: 1,
            delayedVoyages: 1,
            pendingMaintenance: 3,
            totalMaintenanceCost: 132100,
            fuelConsumed: 3690,
            totalFuelCostUSD: 2466110,
            cargoInTransit: 334700,
            activeAlerts: 4
          }
        }
      }
    },
    {
      id: 'dashboard-analytics',
      category: 'Dashboard & Stats',
      method: 'GET',
      path: '/api/dashboard/analytics',
      title: 'Operational Analytics & Charts Data',
      description: 'Returns vessel types breakdown, voyage status distributions, monthly fuel trends, and vessel fuel efficiency rankings.',
      authRequired: true,
      headers: { Authorization: 'Bearer <jwt_token>' },
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          data: {
            vesselTypes: [{ name: 'Container Ship', value: 3 }, { name: 'Bulk Carrier', value: 2 }],
            monthlyFuel: [{ month: 'Oct', consumption: 4310, cost: 2810000 }],
            vesselPerformance: [{ vesselName: 'MV Ocean Star', type: 'Container Ship', efficiency: 3.82 }]
          }
        }
      }
    },

    // VESSELS
    {
      id: 'vessels-get',
      category: 'Vessels',
      method: 'GET',
      path: '/api/vessels',
      title: 'List All Registered Vessels',
      description: 'Fetches fleet vessels with optional filters by operational status, vessel type, and text search.',
      authRequired: true,
      queryParams: [
        { name: 'status', type: 'string', description: 'Filter by status: In Transit, Docked, Maintenance, Active, Idle' },
        { name: 'type', type: 'string', description: 'Filter by type: Container Ship, Bulk Carrier, Oil Tanker, LNG Carrier' },
        { name: 'search', type: 'string', description: 'Text search matching vessel name, IMO number, or flag' }
      ],
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 10,
          data: [
            {
              _id: 'vsl_001',
              vesselId: 'VSL-101',
              imoNumber: 'IMO9839438',
              name: 'MV Ocean Star',
              vesselType: 'Container Ship',
              flag: 'Panama',
              capacity: 21500,
              currentFuel: 8420,
              fuelCapacity: 12500,
              status: 'In Transit'
            }
          ]
        }
      }
    },
    {
      id: 'vessels-get-one',
      category: 'Vessels',
      method: 'GET',
      path: '/api/vessels/:id',
      title: 'Get Comprehensive Vessel Profile',
      description: 'Returns single vessel profile with populated active voyage, maintenance records, bunkering logs, and assigned crew.',
      authRequired: true,
      pathParams: [{ name: 'id', type: 'string', description: 'MongoDB vessel ID (e.g. vsl_001)' }],
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          data: {
            _id: 'vsl_001',
            name: 'MV Ocean Star',
            imoNumber: 'IMO9839438',
            deadweightTonnage: 218000,
            activeVoyage: { voyageId: 'VYG-1001', originPort: 'Port of Rotterdam', destinationPort: 'Port of Singapore' }
          }
        }
      }
    },
    {
      id: 'vessels-post',
      category: 'Vessels',
      method: 'POST',
      path: '/api/vessels',
      title: 'Register New Fleet Vessel',
      description: 'Enters a new commercial vessel into MongoDB with engine specifications and IMO uniqueness validation.',
      authRequired: true,
      requiredRole: 'Admin',
      headers: { Authorization: 'Bearer <admin_jwt>', 'Content-Type': 'application/json' },
      requestBody: {
        name: 'MV Pacific Titan',
        imoNumber: 'IMO9776418',
        vesselType: 'Bulk Carrier',
        flag: 'Liberia',
        capacity: 180000,
        deadweightTonnage: 181200,
        grossTonnage: 95400,
        length: 292.0,
        width: 45.0,
        draft: 18.2,
        engineType: 'Hyundai-MAN B&W 6S70ME-C8',
        enginePower: 21500,
        fuelType: 'VLSFO',
        fuelCapacity: 5200,
        currentFuel: 3800,
        status: 'Active',
        yearBuilt: 2020
      },
      responseSuccess: {
        status: 201,
        body: {
          success: true,
          message: 'Vessel registered successfully',
          data: { _id: 'vsl_new', name: 'MV Pacific Titan', imoNumber: 'IMO9776418' }
        }
      },
      responseError: {
        status: 403,
        body: { success: false, message: 'Forbidden: Access requires [admin] permissions' }
      }
    },
    {
      id: 'vessels-put',
      category: 'Vessels',
      method: 'PUT',
      path: '/api/vessels/:id',
      title: 'Update Vessel Specifications',
      description: 'Modifies technical specifications or status for an existing vessel document.',
      authRequired: true,
      requiredRole: 'Admin',
      pathParams: [{ name: 'id', type: 'string', description: 'Vessel ID' }],
      requestBody: {
        status: 'In Transit',
        currentFuel: 4100,
        captain: 'Capt. Arthur Pendelton'
      },
      responseSuccess: {
        status: 200,
        body: { success: true, message: 'Vessel updated successfully' }
      }
    },
    {
      id: 'vessels-delete',
      category: 'Vessels',
      method: 'DELETE',
      path: '/api/vessels/:id',
      title: 'Decommission & Delete Vessel',
      description: 'Permanently removes a vessel record from the MongoDB collection and broadcasts socket deletion.',
      authRequired: true,
      requiredRole: 'Admin',
      pathParams: [{ name: 'id', type: 'string', description: 'Vessel ID' }],
      responseSuccess: {
        status: 200,
        body: { success: true, message: 'Vessel deleted successfully' }
      }
    },

    // VOYAGES
    {
      id: 'voyages-get',
      category: 'Voyages',
      method: 'GET',
      path: '/api/voyages',
      title: 'List All Ocean Voyages',
      description: 'Returns scheduled, active, and completed voyages with route distance and progress.',
      authRequired: true,
      queryParams: [
        { name: 'status', type: 'string', description: 'Planned, Scheduled, In Transit, Arrived, Completed, Delayed' },
        { name: 'vesselId', type: 'string', description: 'Filter by vessel ID' }
      ],
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 8,
          data: [
            {
              _id: 'vyg_001',
              voyageId: 'VYG-1001',
              vesselName: 'MV Ocean Star',
              originPort: 'Port of Rotterdam',
              destinationPort: 'Port of Singapore',
              distanceNauticalMiles: 8450,
              distanceCovered: 4890,
              status: 'In Transit'
            }
          ]
        }
      }
    },
    {
      id: 'voyages-post',
      category: 'Voyages',
      method: 'POST',
      path: '/api/voyages',
      title: 'Schedule & Dispatch Voyage',
      description: 'Dispatches a new voyage, calculates route waypoints, and updates assigned vessel status to In Transit.',
      authRequired: true,
      requiredRole: 'Admin or User',
      requestBody: {
        vesselId: 'vsl_001',
        originPort: 'Port of Rotterdam',
        destinationPort: 'Port of Singapore',
        departureDate: '2026-10-04T08:00:00Z',
        estimatedArrival: '2026-10-22T16:00:00Z',
        distanceNauticalMiles: 8450,
        cargoDescription: '18,500 TEU High Value Electronics'
      },
      responseSuccess: {
        status: 201,
        body: {
          success: true,
          message: 'Voyage created successfully',
          data: { _id: 'vyg_new', voyageId: 'VYG-1009', status: 'Scheduled' }
        }
      }
    },
    {
      id: 'voyages-patch-status',
      category: 'Voyages',
      method: 'PATCH',
      path: '/api/voyages/:id/status',
      title: 'Update Voyage Status & Delays',
      description: 'Updates voyage progress. If status is set to Delayed, automatically logs an operational alert.',
      authRequired: true,
      requiredRole: 'Admin or User',
      pathParams: [{ name: 'id', type: 'string', description: 'Voyage ID' }],
      requestBody: {
        status: 'Delayed',
        delayReason: 'Tropical storm warning near Strait of Malacca'
      },
      responseSuccess: {
        status: 200,
        body: { success: true, message: 'Voyage status updated' }
      }
    },
    {
      id: 'voyages-assign-cargo',
      category: 'Voyages',
      method: 'POST',
      path: '/api/voyages/:id/assign-cargo',
      title: 'Assign Cargo Manifest to Voyage',
      description: 'Links an unassigned cargo bill of lading to a dispatched voyage and updates manifest status to Loaded/In Transit.',
      authRequired: true,
      requiredRole: 'Admin or User',
      pathParams: [{ name: 'id', type: 'string', description: 'Voyage ID' }],
      requestBody: {
        cargoId: 'crg_001'
      },
      responseSuccess: {
        status: 200,
        body: { success: true, message: 'Cargo assigned to voyage successfully' }
      }
    },

    // ROUTE TRACKING
    {
      id: 'tracking-get',
      category: 'Route Tracking',
      method: 'GET',
      path: '/api/tracking',
      title: 'Live Vessel Telemetry Stream',
      description: 'Returns current GPS coordinates, true nautical headings, speed over ground, and active route lines for all vessels.',
      authRequired: true,
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 10,
          data: [
            {
              vesselId: 'vsl_001',
              name: 'MV Ocean Star',
              lat: 22.45,
              lng: 68.32,
              speedKnots: 18.4,
              heading: 112,
              status: 'In Transit'
            }
          ]
        }
      }
    },

    // CARGO
    {
      id: 'cargo-get',
      category: 'Cargo Manifests',
      method: 'GET',
      path: '/api/cargo',
      title: 'List All Cargo Manifests',
      description: 'Fetches commercial cargo manifests with filtering by status and cargo classification.',
      authRequired: true,
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 8,
          data: [
            {
              _id: 'crg_001',
              cargoId: 'CRG-901',
              cargoType: 'Containerized',
              description: 'Electric Vehicle Lithium Battery Packs',
              weightTons: 14200,
              shipper: 'Siemens Logistics GmbH',
              status: 'In Transit'
            }
          ]
        }
      }
    },
    {
      id: 'cargo-post',
      category: 'Cargo Manifests',
      method: 'POST',
      path: '/api/cargo',
      title: 'Register Cargo Manifest',
      description: 'Creates a commercial bill of lading with shipper, consignee, and port parameters.',
      authRequired: true,
      requiredRole: 'Admin or User',
      requestBody: {
        cargoType: 'Containerized',
        description: 'Industrial Machinery Components',
        weightTons: 8500,
        containerCount: 420,
        shipper: 'ABB Logistics Zurich',
        consignee: 'Hyundai Heavy Industries Busan',
        loadingPort: 'Port of Rotterdam',
        dischargePort: 'Port of Busan'
      },
      responseSuccess: {
        status: 201,
        body: { success: true, message: 'Cargo created successfully' }
      }
    },

    // FUEL OPERATIONS
    {
      id: 'fuel-get',
      category: 'Fuel Operations',
      method: 'GET',
      path: '/api/fuel',
      title: 'List Fuel Bunkering Records',
      description: 'Returns historical bunkering transactions sorted by date descending.',
      authRequired: true,
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 6,
          data: [
            {
              _id: 'fl_001',
              vesselName: 'MV Ocean Star',
              fuelType: 'VLSFO',
              quantityMT: 450,
              unitPriceUSD: 645,
              totalCostUSD: 290250,
              fuelEfficiencyNMPerMT: 3.82
            }
          ]
        }
      }
    },
    {
      id: 'fuel-post',
      category: 'Fuel Operations',
      method: 'POST',
      path: '/api/fuel',
      title: 'Log Bunkering Record',
      description: 'Records fuel delivery with automated Total Cost = Quantity × Unit Price and Fuel Efficiency = Distance / Quantity.',
      authRequired: true,
      requiredRole: 'Admin or User',
      requestBody: {
        vesselId: 'vsl_001',
        fuelType: 'VLSFO',
        quantityMT: 500,
        unitPriceUSD: 650,
        supplier: 'TotalEnergies Marine',
        port: 'Port of Rotterdam',
        distanceTravelledNM: 1850
      },
      responseSuccess: {
        status: 201,
        body: {
          success: true,
          message: 'Fuel record logged successfully',
          data: { totalCostUSD: 325000, fuelEfficiencyNMPerMT: 3.7 }
        }
      }
    },
    {
      id: 'fuel-analytics',
      category: 'Fuel Operations',
      method: 'GET',
      path: '/api/fuel/analytics',
      title: 'Fuel Analytics & Vessel Efficiency',
      description: 'Aggregates fuel grades, total expenditures, and compares efficiency across all fleet vessels.',
      authRequired: true,
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          data: {
            totalFuelMT: 3690,
            totalFuelCostUSD: 2466110,
            averagePricePerMT: 668,
            vesselEfficiency: [{ vesselName: 'MV Ocean Star', efficiency: 3.76 }]
          }
        }
      }
    },

    // MAINTENANCE
    {
      id: 'maintenance-get',
      category: 'Maintenance',
      method: 'GET',
      path: '/api/maintenance',
      title: 'List Maintenance Work Orders',
      description: 'Retrieves scheduled, in-progress, and completed maintenance routines.',
      authRequired: true,
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 4,
          data: [
            {
              _id: 'mnt_001',
              maintenanceId: 'MNT-401',
              vesselName: 'MT Atlantic Pioneer',
              maintenanceType: 'Preventive',
              priority: 'High',
              costUSD: 78500,
              status: 'In Progress'
            }
          ]
        }
      }
    },
    {
      id: 'maintenance-post',
      category: 'Maintenance',
      method: 'POST',
      path: '/api/maintenance',
      title: 'Schedule Maintenance Routine',
      description: 'Queues a maintenance routine and triggers operational alerts if priority is Critical or High.',
      authRequired: true,
      requiredRole: 'Admin',
      requestBody: {
        vesselId: 'vsl_004',
        maintenanceType: 'Preventive',
        description: 'Main Engine Cylinder Liner Overhaul',
        priority: 'High',
        startDate: '2026-10-08',
        expectedCompletion: '2026-10-15',
        technician: 'Drydocks World Dubai',
        costUSD: 45000
      },
      responseSuccess: {
        status: 201,
        body: { success: true, message: 'Maintenance scheduled successfully' }
      }
    },

    // PORTS & CREW
    {
      id: 'ports-get',
      category: 'Ports',
      method: 'GET',
      path: '/api/ports',
      title: 'Global Port Directory',
      description: 'Retrieves international marine ports, coordinates, and annual TEU handling capacities.',
      authRequired: true,
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 15,
          data: [{ portCode: 'NLRTM', name: 'Port of Rotterdam', country: 'Netherlands', lat: 51.95, lng: 4.13 }]
        }
      }
    },
    {
      id: 'crew-get',
      category: 'Crew',
      method: 'GET',
      path: '/api/crew',
      title: 'Marine Crew Roster',
      description: 'Lists all certified mariners, roles, STCW qualifications, and assigned vessels.',
      authRequired: true,
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 6,
          data: [{ name: 'Henrik Lindqvist', role: 'Captain', vesselName: 'MV Ocean Star', status: 'On Duty' }]
        }
      }
    },

    // ALERTS
    {
      id: 'alerts-get',
      category: 'Operational Alerts',
      method: 'GET',
      path: '/api/alerts',
      title: 'List Operational Alerts',
      description: 'Fetches active or historical alerts with severity filters (Critical, Warning, Info).',
      authRequired: true,
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 4,
          data: [
            {
              _id: 'alt_001',
              alertType: 'Fuel Low',
              severity: 'Warning',
              message: 'Current fuel reserve for MV Pacific Titan has dropped below 1,000 MT',
              resolved: false
            }
          ]
        }
      }
    },
    {
      id: 'alerts-patch-resolve',
      category: 'Operational Alerts',
      method: 'PATCH',
      path: '/api/alerts/:id/resolve',
      title: 'Resolve Operational Alert',
      description: 'Marks an alert as resolved and attributes the action to the authenticated operator/admin.',
      authRequired: true,
      requiredRole: 'Admin or User',
      pathParams: [{ name: 'id', type: 'string', description: 'Alert ID' }],
      responseSuccess: {
        status: 200,
        body: { success: true, message: 'Alert resolved successfully' }
      }
    },

    // USER ADMIN
    {
      id: 'users-get',
      category: 'User Administration',
      method: 'GET',
      path: '/api/users',
      title: 'List System Accounts',
      description: 'Returns all registered users with roles and status. Passwords are completely omitted.',
      authRequired: true,
      requiredRole: 'Admin Only',
      responseSuccess: {
        status: 200,
        body: {
          success: true,
          count: 4,
          data: [
            { _id: 'usr_admin_001', name: 'Captain Marcus Vance', email: 'admin@shipfleet.com', role: 'admin' },
            { _id: 'usr_user_001', name: 'Elena Rostova', email: 'user@shipfleet.com', role: 'user' }
          ]
        }
      }
    },
    {
      id: 'users-post',
      category: 'User Administration',
      method: 'POST',
      path: '/api/users',
      title: 'Create System User',
      description: 'Creates a new user account with hashed password and role assignment (admin or user).',
      authRequired: true,
      requiredRole: 'Admin Only',
      requestBody: {
        name: 'Second Officer Liam Ward',
        email: 'liam@shipfleet.com',
        password: 'User@123',
        role: 'user',
        department: 'Voyage Dispatch'
      },
      responseSuccess: {
        status: 201,
        body: { success: true, message: 'User created successfully' }
      }
    },

    // REPORTS
    {
      id: 'reports-export',
      category: 'Reports',
      method: 'GET',
      path: '/api/reports/export/:type',
      title: 'Download CSV Report',
      description: 'Generates and downloads standardized CSV report file for fleet, voyages, fuel, or maintenance.',
      authRequired: true,
      pathParams: [{ name: 'type', type: 'string', description: 'One of: fleet, voyages, fuel, maintenance' }],
      responseSuccess: {
        status: 200,
        body: { note: 'Direct text/csv download with Content-Disposition attachment header' }
      }
    }
  ];

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesCat = selectedCategory === 'All' || ep.category === selectedCategory;
    const matchesSearch =
      !search ||
      ep.path.toLowerCase().includes(search.toLowerCase()) ||
      ep.title.toLowerCase().includes(search.toLowerCase()) ||
      ep.description.toLowerCase().includes(search.toLowerCase()) ||
      ep.method.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'POST':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'PUT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'PATCH':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'DELETE':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const generateCurlSnippet = (ep: EndpointDoc) => {
    let cmd = `curl -X ${ep.method} "http://localhost:3000${ep.path}"`;
    if (ep.authRequired) {
      cmd += ` \\\n  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"`;
    }
    if (ep.requestBody) {
      cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(ep.requestBody)}'`;
    }
    return cmd;
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto text-xs">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-400 font-semibold text-[11px] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Developer API Reference &amp; Integration Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Code2 className="w-8 h-8 text-cyan-400" />
            <span>FleetOps REST API Documentation</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Complete specification of all REST endpoints, headers, JSON request payloads &amp; HTTP responses.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 font-semibold border border-blue-500/40 flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          )}
          <button
            onClick={() => toggleAll(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold border border-slate-700"
          >
            Expand All
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold border border-slate-700"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Quick Architecture Reference Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold">
            <Server className="w-4 h-4" />
            <span>Base API URL</span>
          </div>
          <div className="font-mono text-white text-xs">http://localhost:3000/api</div>
          <div className="text-[11px] text-slate-400">All routes prefixed with /api</div>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
          <div className="flex items-center space-x-2 text-blue-400 font-bold">
            <Lock className="w-4 h-4" />
            <span>Authorization Header</span>
          </div>
          <div className="font-mono text-white text-xs">Authorization: Bearer &lt;token&gt;</div>
          <div className="text-[11px] text-slate-400">Signed HMAC-SHA256 JWT</div>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <Layers className="w-4 h-4" />
            <span>RBAC Permission Model</span>
          </div>
          <div className="font-semibold text-white text-xs">Admin &amp; User (2 Logins)</div>
          <div className="text-[11px] text-slate-400">Strict server-side validation</div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search API endpoints by path (e.g. /vessels, /fuel, /status), HTTP method, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {filteredEndpoints.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl">
            No API endpoints match the selected filter criteria.
          </div>
        ) : (
          filteredEndpoints.map((ep) => {
            const isExpanded = !!expandedEndpoints[ep.id];
            const curlSnippet = generateCurlSnippet(ep);

            return (
              <div
                key={ep.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-all"
              >
                {/* Endpoint Header Bar */}
                <div
                  onClick={() => toggleExpand(ep.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-850/60 transition-colors select-none"
                >
                  <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                    <span
                      className={`font-mono font-black text-xs px-2.5 py-1 rounded-lg border uppercase tracking-wider ${getMethodBadge(
                        ep.method
                      )}`}
                    >
                      {ep.method}
                    </span>

                    <span className="font-mono text-sm font-bold text-white tracking-wide">
                      {ep.path}
                    </span>

                    <span className="text-slate-400 font-medium text-xs hidden sm:inline">
                      — {ep.title}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {ep.authRequired ? (
                      <span className="flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        <Lock className="w-3 h-3" />
                        <span>{ep.requiredRole ? ep.requiredRole : 'Authenticated'}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <Unlock className="w-3 h-3" />
                        <span>Public</span>
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-5">
                    <p className="text-slate-300 leading-relaxed">{ep.description}</p>

                    {/* Query & Path Params */}
                    {ep.pathParams && ep.pathParams.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                          URL Path Parameters
                        </h4>
                        <div className="space-y-1">
                          {ep.pathParams.map((p, i) => (
                            <div key={i} className="flex items-baseline space-x-2 font-mono text-[11px]">
                              <span className="text-cyan-400 font-bold">{p.name}</span>
                              <span className="text-slate-500">({p.type}):</span>
                              <span className="text-slate-300 font-sans">{p.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ep.queryParams && ep.queryParams.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                          Query Parameters
                        </h4>
                        <div className="space-y-1">
                          {ep.queryParams.map((q, i) => (
                            <div key={i} className="flex items-baseline space-x-2 font-mono text-[11px]">
                              <span className="text-blue-400 font-bold">{q.name}</span>
                              <span className="text-slate-500">({q.type}):</span>
                              <span className="text-slate-300 font-sans">{q.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body Payload */}
                    {ep.requestBody && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                            Expected JSON Request Body
                          </h4>
                          <button
                            onClick={() =>
                              copyToClipboard(JSON.stringify(ep.requestBody, null, 2), ep.id + '-req')
                            }
                            className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                          >
                            {copiedId === ep.id + '-req' ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy JSON</span>
                          </button>
                        </div>
                        <pre className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                          {JSON.stringify(ep.requestBody, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Sample Success Response */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                            Sample Success Response
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            {ep.responseSuccess.status} OK
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(ep.responseSuccess.body, null, 2),
                              ep.id + '-res'
                            )
                          }
                          className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                        >
                          {copiedId === ep.id + '-res' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy Response</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                        {JSON.stringify(ep.responseSuccess.body, null, 2)}
                      </pre>
                    </div>

                    {/* cURL Command */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <Terminal className="w-3 h-3 text-cyan-400" />
                          <span>Terminal cURL Example</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(curlSnippet, ep.id + '-curl')}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                        >
                          {copiedId === ep.id + '-curl' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy cURL</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                        {curlSnippet}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
