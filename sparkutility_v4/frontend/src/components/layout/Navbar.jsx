import React, { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
	Zap,
	Menu,
	X,
	Sun,
	Moon,
	RefreshCw,
	ChevronDown,
	Wand2,
	Wrench,
	Home,
	Database,
	Palette,
	ShieldCheck,
	Settings2,
	Search,
	Command,
	Music,
	Eye,
	Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useBranding } from '@/context/BrandingContext';

const isMac = typeof navigator !== 'undefined' && (navigator.platform.toUpperCase().includes('MAC') || navigator.userAgent.includes('Macintosh'));

const TOOLS_DROPDOWN = [
	{ path: '/file-converter', label: 'File Converter', icon: RefreshCw, desc: 'Convert Video, Audio, Image & Documents' },
	{ path: '/image-editor', label: 'Image Editor', icon: Wand2, desc: 'Crop, Draw, and make Adjustments' },
	{ path: '/audio-modifier', label: 'Audio Modifier', icon: Music, desc: 'Reverb, Trim & Shape Audio' },
	{ path: '/content-previewer', label: 'Content Previewer', icon: Eye, desc: 'Safe Zones, Social Previews & Thumbnails' },
];

const FLUXKIT_DROPDOWN = [
	{ path: '/fluxkit/data-structure', label: 'Data & Structure', icon: Database, desc: 'JSON, XML, CSV, YAML & SQL tools' },
	{ path: '/fluxkit/web-dev-assets', label: 'Web Dev Assets', icon: Palette, desc: 'CSS, SVG, layouts & colour generators' },
	{ path: '/fluxkit/security-logic', label: 'Security & Logic', icon: ShieldCheck, desc: 'JWT, regex, cron, bcrypt & HTML entities' },
	{ path: '/fluxkit/productivity', label: 'Productivity Tools', icon: Wrench, desc: 'Diff, console log, cURL, Markdown, URL' },
	{ path: '/fluxkit/latex-builder', label: 'LaTeX Builder', icon: Hash, desc: 'Build equations, live KaTeX preview & export' },
];

function NavDropdown({ label, icon: LabelIcon, items, isActive }) {
	const location = useLocation();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const closeTimer = useRef(null);

	const openMenu = () => {
		clearTimeout(closeTimer.current);
		setOpen(true);
	};
	const schedClose = () => {
		closeTimer.current = setTimeout(() => setOpen(false), 150);
	};

	return (
		<div ref={ref} className='relative' onMouseEnter={openMenu} onMouseLeave={schedClose}>
			<Button
				variant='ghost'
				className={`relative flex items-center gap-1.5 text-sm font-medium transition-all duration-200 px-3 ${
					isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
				}`}
			>
				<LabelIcon className='w-3.5 h-3.5' />
				{label}
				<ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
				{isActive && <motion.div layoutId='nav-indicator' className='absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full' />}
			</Button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -4, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -4, scale: 0.97 }}
						transition={{ duration: 0.15 }}
						onMouseEnter={openMenu}
						onMouseLeave={schedClose}
						className='absolute top-full left-0 mt-1.5 w-64 bg-black border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50'
					>
						<div className='p-1.5 space-y-0.5'>
							{items.map((item) => {
								const Icon = item.icon;
								const active = location.pathname === item.path;
								return (
									<Link key={item.path} to={item.path} onClick={() => setOpen(false)}>
										<div
											className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
												active ? 'bg-primary/10 text-primary' : 'hover:bg-neutral-900 text-foreground'
											}`}
										>
											<div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${active ? 'bg-primary/15' : 'bg-neutral-900'}`}>
												<Icon className='w-4 h-4' />
											</div>
											<div>
												<p className='text-sm font-medium leading-none mb-1'>{item.label}</p>
												<p className='text-xs text-neutral-400 leading-tight'>{item.desc}</p>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default function Navbar() {
	const location = useLocation();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [mobileFluxOpen, setMobileFluxOpen] = useState(false);
	const { currentMode, toggleUserMode } = useTheme();
	const { branding } = useBranding();
	const isDark = currentMode === 'dark';

	const splitName = (() => {
		const name = branding.siteName || 'SparkUtilities';
		if (name === 'SparkUtilities') return ['Spark', 'Utilities'];
		return [name, ''];
	})();

	const isToolsActive = TOOLS_DROPDOWN.some((t) => location.pathname === t.path);
	const isFluxActive = FLUXKIT_DROPDOWN.some((t) => location.pathname.startsWith(t.path));

	return (
		<nav className='sticky top-0 z-50 glass-card border-b border-border/50'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex items-center justify-between h-16'>
					{/* Logo */}
					<Link to='/' className='flex items-center gap-2.5 group flex-shrink-0'>
						<div className='w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:glow transition-all duration-300 overflow-hidden'>
							{branding.logo ? <img src={branding.logo} alt='' className='w-full h-full object-contain' /> : <Zap className='w-5 h-5 text-primary' />}
						</div>
						<span className='text-lg font-display font-bold tracking-tight'>
							<span className='gradient-text'>{splitName[0]}</span>
							{splitName[1] && <span className='text-foreground'>{splitName[1]}</span>}
						</span>
					</Link>

					{/* Desktop nav */}
					<div className='hidden md:flex items-center gap-0.5'>
						<Link to='/'>
							<Button
								variant='ghost'
								className={`relative flex items-center gap-1.5 text-sm font-medium px-3 ${
									location.pathname === '/' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Home className='w-3.5 h-3.5' />
								Home
								{location.pathname === '/' && <motion.div layoutId='nav-indicator' className='absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full' />}
							</Button>
						</Link>

						<NavDropdown label='Utilities' icon={Wrench} items={TOOLS_DROPDOWN} isActive={isToolsActive} />
						<FluxKitNav items={FLUXKIT_DROPDOWN} isActive={isFluxActive} />

						<Link to='/settings'>
							<Button
								variant='ghost'
								className={`relative flex items-center gap-1.5 text-sm font-medium px-3 ${
									location.pathname === '/settings' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Settings2 className='w-3.5 h-3.5' />
								Settings
								{location.pathname === '/settings' && <motion.div layoutId='nav-indicator' className='absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full' />}
							</Button>
						</Link>

						{/* SparkEngine trigger */}
						<button
							type='button'
							onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { [isMac ? 'metaKey' : 'ctrlKey']: true, key: 'k', bubbles: true }))}
							className='hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-transparent text-muted-foreground text-xs hover:border-primary/40 hover:text-foreground transition-colors ml-1'
							aria-label={isMac ? 'Open SparkEngine (⌘K)' : 'Open SparkEngine (Ctrl+K)'}
						>
							<Search className='w-3.5 h-3.5' />
							<span className='text-[11px]'>Search</span>
							<kbd className='flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/50 bg-neutral-900/60 text-[9px] font-mono leading-none'>
								{isMac ? (
									<>
										<Command className='w-2.5 h-2.5' />K
									</>
								) : (
									'Ctrl+K'
								)}
							</kbd>
						</button>

						<Button variant='ghost' size='icon' onClick={toggleUserMode} className='ml-1 text-muted-foreground hover:text-foreground'>
							<AnimatePresence mode='wait' initial={false}>
								<motion.span
									key={isDark ? 'moon' : 'sun'}
									initial={{ rotate: -90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: 90, opacity: 0 }}
									transition={{ duration: 0.2 }}
									className='flex'
								>
									{isDark ? <Moon className='w-5 h-5' /> : <Sun className='w-5 h-5' />}
								</motion.span>
							</AnimatePresence>
						</Button>
					</div>

					<div className='md:hidden flex items-center gap-1'>
						<Button variant='ghost' size='icon' onClick={toggleUserMode} className='text-muted-foreground'>
							{isDark ? <Moon className='w-5 h-5' /> : <Sun className='w-5 h-5' />}
						</Button>
						<Button variant='ghost' size='icon' onClick={() => setMobileOpen(!mobileOpen)}>
							{mobileOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
						</Button>
					</div>
				</div>
			</div>

			{/* Mobile menu */}
			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className='md:hidden border-t border-border/50 overflow-hidden'
					>
						<div className='px-4 py-3 space-y-1'>
							<Link to='/' onClick={() => setMobileOpen(false)}>
								<Button variant='ghost' className={`w-full justify-start gap-2 ${location.pathname === '/' ? 'text-foreground bg-secondary' : 'text-muted-foreground'}`}>
									<Home className='w-4 h-4' /> Home
								</Button>
							</Link>
							<div className='border-t border-border/30 my-1' />
							<button
								onClick={() => setMobileFluxOpen(!mobileFluxOpen)}
								className='w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest'
							>
								<span>
									<span className='text-yellow-400'>Flux</span>Kit
								</span>
								<ChevronDown className={`w-3 h-3 transition-transform ${mobileFluxOpen ? 'rotate-180' : ''}`} />
							</button>
							{mobileFluxOpen && (
								<>
									{FLUXKIT_DROPDOWN.map((item) => {
										const Icon = item.icon;
										return (
											<Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
												<Button
													variant='ghost'
													className={`w-full justify-start gap-2 pl-6 ${location.pathname.startsWith(item.path) ? 'text-foreground bg-secondary' : 'text-muted-foreground'}`}
												>
													<Icon className='w-4 h-4' /> {item.label}
												</Button>
											</Link>
										);
									})}
									<Link to='/fluxkit' onClick={() => setMobileOpen(false)}>
										<Button
											variant='ghost'
											className={`w-full justify-start gap-2 pl-6 text-yellow-400/80 hover:text-yellow-400 ${location.pathname === '/fluxkit' ? 'bg-secondary' : ''}`}
										>
											<Zap className='w-4 h-4' /> View all FluxKit tools
										</Button>
									</Link>
								</>
							)}
							<div className='border-t border-border/30 my-1' />
							<p className='text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 pt-1 pb-0.5'>Utilities</p>
							{TOOLS_DROPDOWN.map((tool) => {
								const Icon = tool.icon;
								return (
									<Link key={tool.path} to={tool.path} onClick={() => setMobileOpen(false)}>
										<Button
											variant='ghost'
											className={`w-full justify-start gap-2 ${location.pathname === tool.path ? 'text-foreground bg-secondary' : 'text-muted-foreground'}`}
										>
											<Icon className='w-4 h-4' /> {tool.label}
										</Button>
									</Link>
								);
							})}
							<div className='border-t border-border/30 my-1' />
							<Link to='/settings' onClick={() => setMobileOpen(false)}>
								<Button variant='ghost' className={`w-full justify-start gap-2 ${location.pathname === '/settings' ? 'text-foreground bg-secondary' : 'text-muted-foreground'}`}>
									<Settings2 className='w-4 h-4' /> Settings
								</Button>
							</Link>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</nav>
	);
}

function FluxKitNav({ items, isActive }) {
	const location = useLocation();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const closeTimer = useRef(null);
	const openMenu = () => {
		clearTimeout(closeTimer.current);
		setOpen(true);
	};
	const schedClose = () => {
		closeTimer.current = setTimeout(() => setOpen(false), 150);
	};

	return (
		<div ref={ref} className='relative group/fluxnav' onMouseEnter={openMenu} onMouseLeave={schedClose}>
			<Button
				variant='ghost'
				onClick={() => navigate('/fluxkit')}
				className={`relative flex items-center gap-1.5 text-sm font-medium px-3 overflow-hidden hover:bg-transparent ${
					isActive ? 'text-yellow-400' : 'text-muted-foreground group-hover/fluxnav:text-yellow-400'
				}`}
			>
				<span
					className='absolute inset-0 opacity-0 group-hover/fluxnav:opacity-100 transition-opacity duration-200 pointer-events-none'
					style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(146,64,14,0.08) 100%)' }}
				/>
				<Zap className='relative w-3.5 h-3.5' style={{ fill: '#FACC15', color: '#FACC15' }} />
				<span className='relative'>
					<span className='text-yellow-400 font-bold'>Flux</span>
					<span className='font-medium'>Kit</span>
				</span>
				<ChevronDown className={`relative w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
				{isActive && <motion.div layoutId='fluxkit-indicator' className='absolute bottom-0 left-2 right-2 h-0.5 bg-yellow-400 rounded-full' />}
			</Button>
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -4, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -4, scale: 0.97 }}
						transition={{ duration: 0.15 }}
						onMouseEnter={openMenu}
						onMouseLeave={schedClose}
						className='absolute top-full left-0 mt-1.5 w-72 bg-black border border-yellow-900/40 rounded-xl shadow-xl overflow-hidden z-50'
					>
						<div className='px-4 py-3 border-b border-yellow-900/30' style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(0,0,0,0) 100%)' }}>
							<p className='text-sm font-bold'>
								<span className='text-yellow-400'>Flux</span>
								<span className='text-foreground'>Kit</span>
							</p>
							<p className='text-[11px] text-muted-foreground mt-0.5'>Coding utilities for developers</p>
						</div>
						<div className='p-1.5 space-y-0.5'>
							{items.map((item) => {
								const Icon = item.icon;
								const active = location.pathname.startsWith(item.path);
								return (
									<Link key={item.path} to={item.path} onClick={() => setOpen(false)}>
										<div
											className={`group/fitem flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
												active ? 'bg-yellow-500/10 text-yellow-400' : 'hover:bg-yellow-500/5 hover:text-yellow-400 text-foreground'
											}`}
										>
											<div
												className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
													active ? 'bg-yellow-500/15' : 'bg-neutral-900 group-hover/fitem:bg-yellow-500/10'
												}`}
											>
												<Icon className='w-4 h-4' />
											</div>
											<div>
												<p className='text-sm font-medium leading-none mb-1'>{item.label}</p>
												<p className='text-xs text-neutral-400 leading-tight'>{item.desc}</p>
											</div>
										</div>
									</Link>
								);
							})}
							<Link to='/fluxkit' onClick={() => setOpen(false)}>
								<div className='flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-900 transition-colors mt-1 border-t border-neutral-800'>
									<span className='text-xs text-yellow-400/70 font-medium'>View all FluxKit tools →</span>
								</div>
							</Link>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
